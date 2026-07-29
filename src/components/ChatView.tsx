import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useAppStore, useChatStore, useGenerationStore } from '@/lib/stores';
import { apiGet, apiPost, streamChat, runGenerationInterceptors } from '@/lib/api';
import type { StreamChatRequest } from '@/lib/api';
import { cn, frostedGlass } from '@/lib/utils';
import { emit } from '@/lib/extensionEventBus';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useResolvedPersona } from '@/hooks/useResolvedPersona';
import { setChatPersona } from '@/lib/api';
import { PersonaSelector } from '@/components/PersonaSelector';

import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import type { Character } from '@/shared/types/character';
import { parseThinkingChunks } from '@/lib/parseThinking';
import type { ReasoningSettings } from '@/shared/types/reasoning';

type CharacterWithId = Character & { id: number };

interface ChatViewProps {
  characterId: number;
}

interface SettingsData {
  chat_completion_source?: string;
  chat_completion_model?: string;
  chat_name_your_name?: string;
  [key: string]: unknown;
}

export function ChatView({ characterId }: ChatViewProps) {
  const queryClient = useQueryClient();
  const {
    activeChatId,
    messages,
    isGenerating,
    streamingContent,
    streamingThinking,
    isThinkingStream,
    setActiveChat,
    setMessages,
    addMessage,
    removeMessage,
    setStreamingContent,
    setStreamingThinking,
    setIsThinkingStream,
    appendStreamingContent,
    commitStreaming,
    setIsGenerating,
    clearChat,
  } = useChatStore();

  const genStore = useGenerationStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef('');

  const { streamingEnabled, smoothStreaming } = useAppStore();

  // Drip buffer state: pending chunks waiting to be released to the UI at a
  // pace determined by `smoothStreaming`. 0 = no pacing (release immediately).
  // Higher = slower drip rate (smoother reveal).
  const dripRef = useRef<{
    pending: string;
    timer: ReturnType<typeof setTimeout> | null;
    bodyDripEmitted: number;
    thinkingSoFar: string | undefined;
    inThinking: boolean;
  }>({
    pending: '',
    timer: null,
    bodyDripEmitted: 0,
    thinkingSoFar: undefined,
    inThinking: false,
  });

  const flushDrip = useCallback(() => {
    if (dripRef.current.timer) {
      clearTimeout(dripRef.current.timer);
      dripRef.current.timer = null;
    }
    if (dripRef.current.pending) {
      appendStreamingContent(dripRef.current.pending);
      dripRef.current.pending = '';
    }
  }, [appendStreamingContent]);

  const scheduleDrip = useCallback(() => {
    const { smoothStreaming } = useAppStore.getState();
    if (smoothStreaming <= 0) {
      flushDrip();
      return;
    }
    const delayMs = Math.round(smoothStreaming);
    dripRef.current.timer = setTimeout(() => {
      const pending = dripRef.current.pending;
      if (!pending) {
        dripRef.current.timer = null;
        return;
      }
      const SLICE = 3;
      const slice = pending.slice(0, SLICE);
      dripRef.current.pending = pending.slice(SLICE);
      appendStreamingContent(slice);
      if (dripRef.current.pending) {
        scheduleDripRef.current?.();
      } else {
        dripRef.current.timer = null;
      }
    }, delayMs);
  }, [appendStreamingContent]);

  const scheduleDripRef = useRef(scheduleDrip);
  scheduleDripRef.current = scheduleDrip;

  const { data: character, isLoading: charLoading } = useQuery<CharacterWithId>({
    queryKey: ['/api/v1/characters/get', characterId],
    queryFn: async () => {
      return await apiPost<CharacterWithId>('/characters/get', { id: characterId });
    },
  });

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ['/api/v1/settings/get'],
    queryFn: async () => {
      return await apiGet<SettingsData>('/settings/get');
    },
  });

  const reasoningSettings = useMemo(() => {
    const r = (settings as { textOptions?: { reasoning?: Partial<ReasoningSettings> } } | undefined)
      ?.textOptions?.reasoning;
    return r
      ? {
          prefix: r.prefix ?? '',
          suffix: r.suffix ?? '',
          separator: r.separator ?? '\n',
          autoParse: r.autoParse ?? false,
          autoExpand: r.autoExpand ?? false,
          showHidden: r.showHidden ?? false,
          addToPrompts: r.addToPrompts ?? false,
          maxAdditions: r.maxAdditions ?? 1,
        }
      : {
          prefix: '',
          suffix: '',
          separator: '\n',
          autoParse: false,
          autoExpand: false,
          showHidden: false,
          addToPrompts: false,
          maxAdditions: 1,
        };
  }, [settings]);

  const { data: chatData } = useQuery({
    queryKey: ['/api/v1/chats/get', activeChatId],
    queryFn: async () => {
      if (!activeChatId) return null;
      return await apiPost<{
        ok: boolean;
        messages: ChatMessageType[];
        metadata: Record<string, unknown>;
      }>('/chats/get', { fileId: activeChatId });
    },
    enabled: !!activeChatId,
  });

  const chatPersonaId =
    ((chatData?.metadata as Record<string, unknown>)?.personaId as number | null) ?? null;
  const resolvedPersona = useResolvedPersona(chatPersonaId, character?.boundPersonaId);

  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages);
    }
  }, [chatData?.messages, setMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const createChatMutation = useMutation({
    mutationFn: async (charName: string) => {
      const userName = resolvedPersona.name;
      const result = await apiPost<{ ok: boolean; fileId: string }>('/chats/save', {
        characterName: charName,
        userName,
      });
      const fileId = result.fileId as string;

      if (character?.first_mes) {
        const firstMsg: ChatMessageType = {
          name: character.name,
          is_user: false,
          mes: character.first_mes,
          send_date: new Date().toISOString(),
          extra: {},
        };
        await apiPost<{ ok: boolean }>('/chats/message', {
          fileId,
          action: 'append',
          message: firstMsg,
        });
      }

      return fileId;
    },
    onSuccess: (fileId) => {
      setActiveChat(fileId);
    },
  });

  const appendMessageMutation = useMutation({
    mutationFn: async ({ fileId, message }: { fileId: string; message: ChatMessageType }) => {
      return await apiPost<{ ok: boolean }>('/chats/message', {
        fileId,
        action: 'append',
        message,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chats/get'] });
    },
  });

  const findExistingChat = useCallback(async () => {
    if (!character) return;
    const charName = character.name;
    try {
      const chats = await apiPost<Array<{ file_id: string }>>('/chats/listByCharacter', {
        characterName: charName,
      });
      if (Array.isArray(chats) && chats.length > 0) {
        const chat = chats[0] as { file_id: string };
        setActiveChat(chat.file_id);
      } else {
        await createChatMutation.mutateAsync(charName);
      }
    } catch {
      await createChatMutation.mutateAsync(charName);
    }
  }, [character, setActiveChat, createChatMutation]);

  useEffect(() => {
    if (character && !activeChatId) {
      findExistingChat();
    }
  }, [character, activeChatId, findExistingChat]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    flushDrip(); // ensure no orphaned pending tokens after stop
    setIsGenerating(false);
    emit('generation_stopped', { characterId });
    if (streamingContent || fullContentRef.current) {
      let parsed: { mes: string; thinking?: string } | undefined;
      if (
        reasoningSettings.autoParse &&
        reasoningSettings.prefix &&
        reasoningSettings.suffix &&
        fullContentRef.current
      ) {
        const p = parseThinkingChunks(fullContentRef.current, reasoningSettings);
        parsed = { mes: p.body, thinking: p.thinking };
      }
      commitStreaming(character?.name ?? 'Assistant', parsed);
    }
  }, [
    abortRef,
    streamingContent,
    character,
    setIsGenerating,
    commitStreaming,
    flushDrip,
    reasoningSettings,
  ]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!character || !activeChatId || isGenerating) return;

      const userName = resolvedPersona.name;
      const userMsg: ChatMessageType = {
        name: userName,
        is_user: true,
        mes: text,
        send_date: new Date().toISOString(),
        extra: {},
      };

      addMessage(userMsg);
      await appendMessageMutation.mutateAsync({ fileId: activeChatId, message: userMsg });

      const allMessages = [...messages, userMsg];

      const promptBuildResult = await apiPost<{
        messages: Array<{ role: string; content: string; name?: string }>;
        tokenCount: number;
      }>('/prompt-builder/build', {
        characterId: characterId,
        messages: allMessages,
        userName: userName,
        includeExamples: true,
        reasoning: {
          addToPrompts: reasoningSettings.addToPrompts,
          maxAdditions: reasoningSettings.maxAdditions,
          prefix: reasoningSettings.prefix,
          suffix: reasoningSettings.suffix,
          separator: reasoningSettings.separator,
        },
      });

      const promptMessages = promptBuildResult.messages;

      const source = (settings?.chat_completion_source as string) || 'openai';
      const model = (settings?.chat_completion_model as string) || 'gpt-3.5-turbo';

      setIsGenerating(true);
      emit('generation_started', { characterId });
      setStreamingContent('');
      setStreamingThinking(undefined);
      setIsThinkingStream(false);
      dripRef.current.bodyDripEmitted = 0;
      dripRef.current.thinkingSoFar = undefined;
      dripRef.current.inThinking = false;

      abortRef.current = new AbortController();

      const genParams: Record<string, unknown> = {
        temperature: genStore.temperature,
        top_p: genStore.top_p,
        top_k: genStore.top_k,
        max_tokens: genStore.max_tokens,
        seed: genStore.seed,
        streaming: streamingEnabled,
        stop: genStore.stop.length > 0 ? genStore.stop : undefined,
      };

      if (genStore.mode === 'chat') {
        genParams.frequency_penalty = genStore.frequency_penalty;
        genParams.presence_penalty = genStore.presence_penalty;
      } else {
        genParams.min_p = genStore.min_p;
        genParams.typical_p = genStore.typical_p;
        genParams.top_a = genStore.top_a;
        genParams.tfs = genStore.tfs;
        genParams.rep_pen = genStore.rep_pen;
        genParams.rep_pen_range = genStore.rep_pen_range;
        genParams.rep_pen_slope = genStore.rep_pen_slope;
        genParams.dry_multiplier = genStore.dry_multiplier;
        genParams.dry_base = genStore.dry_base;
        genParams.dry_allowed_length = genStore.dry_allowed_length;
        genParams.mirostat_mode = genStore.mirostat_mode;
        genParams.mirostat_tau = genStore.mirostat_tau;
        genParams.mirostat_eta = genStore.mirostat_eta;
        genParams.smoothing_factor = genStore.smoothing_factor;
        genParams.epsilon_cutoff = genStore.epsilon_cutoff;
        genParams.eta_cutoff = genStore.eta_cutoff;
        genParams.min_tokens = genStore.min_tokens;
      }

      let fullContent = '';
      fullContentRef.current = '';
      try {
        const interceptorRequest: StreamChatRequest = {
          chat_completion_source: source,
          model: genStore.model || model,
          messages: promptMessages,
          ...genParams,
        };

        const interceptedRequest = await runGenerationInterceptors(
          interceptorRequest,
          abortRef.current!.signal,
        );
        if (!interceptedRequest) {
          // An interceptor aborted this generation. Treat as user-cancelled.
          return;
        }

        const generator = streamChat(interceptedRequest);

        for await (const chunk of generator) {
          if (abortRef.current?.signal.aborted) break;
          fullContent += chunk;
          fullContentRef.current = fullContent;
          emit('message_chunk_received', { chunk, index: messages.length + 1 });
          const currentSmooth = useAppStore.getState().smoothStreaming;
          if (reasoningSettings.autoParse && reasoningSettings.prefix && reasoningSettings.suffix) {
            const parsed = parseThinkingChunks(fullContent, reasoningSettings);
            const bodyChunk =
              parsed.body.length > dripRef.current.bodyDripEmitted
                ? parsed.body.slice(dripRef.current.bodyDripEmitted)
                : '';
            dripRef.current.bodyDripEmitted = parsed.body.length;
            if (dripRef.current.thinkingSoFar !== parsed.thinking) {
              dripRef.current.thinkingSoFar = parsed.thinking;
              setStreamingThinking(parsed.thinking);
            }
            if (dripRef.current.inThinking !== parsed.inThinking) {
              dripRef.current.inThinking = parsed.inThinking;
              setIsThinkingStream(parsed.inThinking);
            }
            if (currentSmooth > 0) {
              dripRef.current.pending += bodyChunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(bodyChunk);
            }
          } else {
            if (currentSmooth > 0) {
              dripRef.current.pending += chunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(chunk);
            }
          }
        }
        flushDrip();

        if (fullContent) {
          let finalMes = fullContent;
          let finalThinking: string | undefined;
          if (reasoningSettings.autoParse && reasoningSettings.prefix && reasoningSettings.suffix) {
            const parsed = parseThinkingChunks(fullContent, reasoningSettings);
            finalMes = parsed.body;
            finalThinking = parsed.thinking;
          }
          const assistantMsg: ChatMessageType = {
            name: character.name,
            is_user: false,
            mes: finalMes,
            thinking: finalThinking,
            send_date: new Date().toISOString(),
            extra: {},
          };
          addMessage(assistantMsg);
          setStreamingContent('');
          setStreamingThinking(undefined);
          setIsThinkingStream(false);
          await appendMessageMutation.mutateAsync({ fileId: activeChatId, message: assistantMsg });
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          console.error('Streaming error:', error);
          if (fullContent) {
            const assistantMsg: ChatMessageType = {
              name: character.name,
              is_user: false,
              mes: fullContent,
              send_date: new Date().toISOString(),
              extra: {},
            };
            addMessage(assistantMsg);
            setStreamingContent('');
            setStreamingThinking(undefined);
            setIsThinkingStream(false);
            await appendMessageMutation.mutateAsync({
              fileId: activeChatId,
              message: assistantMsg,
            });
          }
        }
      } finally {
        flushDrip();
        setIsGenerating(false);
        emit('generation_stopped', { characterId });
        abortRef.current = null;
      }
    },
    [
      character,
      activeChatId,
      isGenerating,
      settings,
      messages,
      genStore,
      resolvedPersona,
      addMessage,
      appendMessageMutation,
      setIsGenerating,
      setStreamingContent,
      setStreamingThinking,
      setIsThinkingStream,
      appendStreamingContent,
      streamingEnabled,
      smoothStreaming,
      scheduleDrip,
      flushDrip,
      reasoningSettings,
      fullContentRef,
    ],
  );

  const handleNewChat = useCallback(() => {
    if (!character) return;
    clearChat();
    setTimeout(() => {
      createChatMutation.mutate(character.name);
    }, 100);
  }, [character, clearChat, createChatMutation]);

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      console.error('Failed to copy message');
    });
  }, []);

  const handleEditMessage = useCallback(
    async (index: number, newText: string) => {
      if (!activeChatId || index >= messages.length) return;
      const msg = messages[index];
      if (!msg) return;
      if (newText.trim().length === 0) return; // ignore empty edits — keep previous message text

      const updatedMsg = { ...msg, mes: newText };
      const newMessages = [...messages];
      newMessages[index] = updatedMsg;
      setMessages(newMessages);
      emit('message_updated', { index, message: updatedMsg });

      try {
        await apiPost('/chats/message', {
          fileId: activeChatId,
          action: 'edit',
          index,
          updates: updatedMsg,
        });
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
    },
    [activeChatId, messages, setMessages],
  );

  const handleDeleteMessage = useCallback(
    async (index: number) => {
      if (!activeChatId || index < 0 || index >= messages.length) return;
      if (index === 0) return; // never delete the greeting (first message)

      removeMessage(index);
      emit('message_removed', { index });

      try {
        await apiPost('/chats/message', {
          fileId: activeChatId,
          action: 'delete',
          index,
        });
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    },
    [activeChatId, messages, removeMessage],
  );

  const handleRegenerate = useCallback(
    async (index: number) => {
      if (!character || !activeChatId || isGenerating) return;
      if (index < 0 || index >= messages.length) return;

      const userName = resolvedPersona.name;
      const truncatedMessages = messages.slice(0, index);

      setIsGenerating(true);
      emit('generation_started', { characterId });
      setStreamingContent('');
      setStreamingThinking(undefined);
      setIsThinkingStream(false);
      dripRef.current.bodyDripEmitted = 0;
      dripRef.current.thinkingSoFar = undefined;
      dripRef.current.inThinking = false;
      abortRef.current = new AbortController();

      const genParams: Record<string, unknown> = {
        temperature: genStore.temperature,
        top_p: genStore.top_p,
        top_k: genStore.top_k,
        max_tokens: genStore.max_tokens,
        seed: genStore.seed,
        streaming: streamingEnabled,
        stop: genStore.stop.length > 0 ? genStore.stop : undefined,
      };

      if (genStore.mode === 'chat') {
        genParams.frequency_penalty = genStore.frequency_penalty;
        genParams.presence_penalty = genStore.presence_penalty;
      } else {
        genParams.min_p = genStore.min_p;
        genParams.typical_p = genStore.typical_p;
        genParams.top_a = genStore.top_a;
        genParams.tfs = genStore.tfs;
        genParams.rep_pen = genStore.rep_pen;
        genParams.rep_pen_range = genStore.rep_pen_range;
        genParams.rep_pen_slope = genStore.rep_pen_slope;
        genParams.dry_multiplier = genStore.dry_multiplier;
        genParams.dry_base = genStore.dry_base;
        genParams.dry_allowed_length = genStore.dry_allowed_length;
        genParams.mirostat_mode = genStore.mirostat_mode;
        genParams.mirostat_tau = genStore.mirostat_tau;
        genParams.mirostat_eta = genStore.mirostat_eta;
        genParams.smoothing_factor = genStore.smoothing_factor;
        genParams.epsilon_cutoff = genStore.epsilon_cutoff;
        genParams.eta_cutoff = genStore.eta_cutoff;
        genParams.min_tokens = genStore.min_tokens;
      }

      let fullContent = '';
      fullContentRef.current = '';
      try {
        const interceptorRequest: StreamChatRequest = {
          chat_completion_source: (settings?.chat_completion_source as string) || 'openai',
          model: genStore.model || (settings?.chat_completion_model as string) || 'gpt-3.5-turbo',
          messages: truncatedMessages.map((m) => ({
            role: m.is_user ? 'user' : 'assistant',
            content: m.mes,
            name: m.name,
          })),
          ...genParams,
        };

        const interceptedRequest = await runGenerationInterceptors(
          interceptorRequest,
          abortRef.current!.signal,
        );
        if (!interceptedRequest) {
          // An interceptor aborted this generation. Treat as user-cancelled.
          return;
        }

        const generator = streamChat(interceptedRequest);

        for await (const chunk of generator) {
          if (abortRef.current?.signal.aborted) break;
          fullContent += chunk;
          fullContentRef.current = fullContent;
          emit('message_chunk_received', { chunk, index: messages.length + 1 });
          const currentSmooth = useAppStore.getState().smoothStreaming;
          if (reasoningSettings.autoParse && reasoningSettings.prefix && reasoningSettings.suffix) {
            const parsed = parseThinkingChunks(fullContent, reasoningSettings);
            const bodyChunk =
              parsed.body.length > dripRef.current.bodyDripEmitted
                ? parsed.body.slice(dripRef.current.bodyDripEmitted)
                : '';
            dripRef.current.bodyDripEmitted = parsed.body.length;
            if (dripRef.current.thinkingSoFar !== parsed.thinking) {
              dripRef.current.thinkingSoFar = parsed.thinking;
              setStreamingThinking(parsed.thinking);
            }
            if (dripRef.current.inThinking !== parsed.inThinking) {
              dripRef.current.inThinking = parsed.inThinking;
              setIsThinkingStream(parsed.inThinking);
            }
            if (currentSmooth > 0) {
              dripRef.current.pending += bodyChunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(bodyChunk);
            }
          } else {
            if (currentSmooth > 0) {
              dripRef.current.pending += chunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(chunk);
            }
          }
        }
        flushDrip();

        if (fullContent) {
          let finalMes = fullContent;
          let finalThinking: string | undefined;
          if (reasoningSettings.autoParse && reasoningSettings.prefix && reasoningSettings.suffix) {
            const parsed = parseThinkingChunks(fullContent, reasoningSettings);
            finalMes = parsed.body;
            finalThinking = parsed.thinking;
          }
          const assistantMsg: ChatMessageType = {
            name: character.name,
            is_user: false,
            mes: finalMes,
            thinking: finalThinking,
            send_date: new Date().toISOString(),
            extra: {},
          };
          const newMessages = [...truncatedMessages, assistantMsg];
          setMessages(newMessages);
          setStreamingContent('');
          setStreamingThinking(undefined);
          setIsThinkingStream(false);
          await apiPost('/chats/message', {
            fileId: activeChatId,
            action: 'append',
            message: assistantMsg,
          });
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          console.error('Regeneration error:', error);
        }
      } finally {
        flushDrip();
        setIsGenerating(false);
        emit('generation_stopped', { characterId });
        abortRef.current = null;
      }
    },
    [
      character,
      activeChatId,
      isGenerating,
      settings,
      messages,
      genStore,
      resolvedPersona,
      setIsGenerating,
      setStreamingContent,
      setStreamingThinking,
      setIsThinkingStream,
      appendStreamingContent,
      setMessages,
      streamingEnabled,
      smoothStreaming,
      scheduleDrip,
      flushDrip,
      reasoningSettings,
      fullContentRef,
    ],
  );

  if (charLoading) {
    return <LoadingSpinner size="lg" label="retrieving persona" className="h-full" />;
  }

  if (!character) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="mono-tag text-destructive">persona not found</span>
      </div>
    );
  }

  const displayMessages = [
    ...messages,
    ...(streamingContent || isThinkingStream
      ? [
          {
            name: character.name,
            is_user: false,
            mes: streamingContent,
            thinking: streamingThinking,
            send_date: new Date().toISOString(),
            extra: {},
          } as ChatMessageType,
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Forge session header */}
      <header
        className={cn(
          frostedGlass,
          'z-10 flex h-14 shrink-0 items-center justify-between gap-2 px-6 sm:px-10',
        )}
      >
        {/* Left: persona + character identity */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="border-ember/40 bg-ember/10 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border">
            {resolvedPersona.avatar ? (
              <img
                src={resolvedPersona.avatar}
                alt={resolvedPersona.name}
                className="h-8 w-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="display-host text-ember text-[13px] font-semibold">
                {resolvedPersona.name[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="display-host text-ember/90 truncate text-[13px] font-medium">
              {resolvedPersona.name}
            </span>
            <span className="text-muted-foreground/60 truncate text-[11px]">
              {character?.name ?? '—'}
            </span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex shrink-0 items-center gap-2">
          <PersonaSelector
            value={chatPersonaId}
            onChange={(personaId) => {
              if (activeChatId) {
                setChatPersona(activeChatId, personaId);
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewChat}
            title="Start a new conversation"
            className="h-7 transition-transform hover:scale-105"
          >
            <MessageSquarePlus className="h-3 w-3" />
            <span className="mono-tag hidden sm:inline">New Session</span>
          </Button>
        </div>
      </header>

      {/* Messages stream */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="relative mx-auto max-w-6xl space-y-4 px-6 py-4 sm:px-10">
          {displayMessages.map((msg, i) => (
            <ChatMessage
              key={`${i}-${msg.send_date ?? i}`}
              msg={msg}
              index={i}
              characterAvatar={`/api/v1/characters/thumbnail?id=${characterId}`}
              userAvatar={resolvedPersona.avatar ?? undefined}
              userName={resolvedPersona.name}
              characterName={character.name}
              description={character.description}
              personality={character.personality}
              scenario={character.scenario}
              first_mes={character.first_mes}
              mes_example={character.mes_example}
              creator_notes={character.creator_notes}
              system_prompt={character.system_prompt}
              post_history_instructions={character.post_history_instructions}
              onCopy={handleCopyMessage}
              onEdit={handleEditMessage}
              onRegenerate={handleRegenerate}
              onDelete={handleDeleteMessage}
              canDelete={i !== 0}
              autoExpandThinking={reasoningSettings.autoExpand}
              showHidden={reasoningSettings.showHidden}
            />
          ))}
          {isGenerating && (streamingContent || isThinkingStream) && smoothStreaming > 0 && (
            <div className="flex justify-start">
              {isThinkingStream ? (
                <span className="mono-tag text-muted-foreground/65">Thinking…</span>
              ) : (
                <span
                  aria-hidden
                  className="mes_text-cursor animate-in fade-in slide-in-from-top-1 bg-ember/80 fill-mode-forwards ml-1 inline-block h-3.5 w-1 rounded-sm align-text-bottom"
                />
              )}
            </div>
          )}
          {isGenerating && !streamingContent && (
            <div className="flex justify-start gap-2.5">
              <div className="border-border bg-muted/40 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border">
                <span className="dot-hot" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </div>
              <div className="bg-card border-border flex items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_5%,transparent)]">
                <LoadingSpinner size="sm" />
                <span className="mono-tag text-muted-foreground/65">stoking the engine</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        onStop={stopGeneration}
        disabled={!activeChatId || createChatMutation.isPending}
        isGenerating={isGenerating}
      />
    </div>
  );
}
