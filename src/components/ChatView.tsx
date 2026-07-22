import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useChatStore, useGenerationStore } from '@/lib/stores';
import { apiGet, apiPost, streamChat } from '@/lib/api';
import { cn, frostedGlass } from '@/lib/utils';

import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import type { Character } from '@/shared/types/character';

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
    setActiveChat,
    setMessages,
    addMessage,
    setStreamingContent,
    appendStreamingContent,
    commitStreaming,
    setIsGenerating,
    clearChat,
  } = useChatStore();

  const genStore = useGenerationStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      const userName = (settings?.chat_name_your_name as string) || 'User';
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
    setIsGenerating(false);
    if (streamingContent) {
      commitStreaming(character?.name ?? 'Assistant');
    }
  }, [abortRef, streamingContent, character, setIsGenerating, commitStreaming]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!character || !activeChatId || isGenerating) return;

      const userName = (settings?.chat_name_your_name as string) || 'User';
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
      });

      const promptMessages = promptBuildResult.messages;

      const source = (settings?.chat_completion_source as string) || 'openai';
      const model = (settings?.chat_completion_model as string) || 'gpt-3.5-turbo';

      setIsGenerating(true);
      setStreamingContent('');

      abortRef.current = new AbortController();

      const genParams: Record<string, unknown> = {
        temperature: genStore.temperature,
        top_p: genStore.top_p,
        top_k: genStore.top_k,
        max_tokens: genStore.max_tokens,
        seed: genStore.seed,
        streaming: genStore.streaming,
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
      try {
        const generator = streamChat({
          chat_completion_source: source,
          model: genStore.model || model,
          messages: promptMessages,
          ...genParams,
        });

        for await (const chunk of generator) {
          if (abortRef.current?.signal.aborted) break;
          fullContent += chunk;
          appendStreamingContent(chunk);
        }

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
            await appendMessageMutation.mutateAsync({
              fileId: activeChatId,
              message: assistantMsg,
            });
          }
        }
      } finally {
        setIsGenerating(false);
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
      addMessage,
      appendMessageMutation,
      setIsGenerating,
      setStreamingContent,
      appendStreamingContent,
    ],
  );

  const handleNewChat = useCallback(() => {
    if (!character) return;
    clearChat();
    setTimeout(() => {
      createChatMutation.mutate(character.name);
    }, 100);
  }, [character, clearChat, createChatMutation]);

  if (charLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="text-ember h-7 w-7 animate-spin" />
        <span className="mono-tag text-muted-foreground/55">retrieving persona</span>
      </div>
    );
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
    ...(streamingContent
      ? [
          {
            name: character.name,
            is_user: false,
            mes: streamingContent,
            send_date: new Date().toISOString(),
            extra: {},
          } as ChatMessageType,
        ]
      : []),
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Forge session header */}
      <header className={cn(frostedGlass, 'z-10 flex h-14 shrink-0 items-center justify-end px-4')}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          title="Start a new conversation"
          className="h-7 transition-transform hover:scale-105"
        >
          <MessageSquarePlus className="h-3 w-3" />
          <span className="mono-tag">New Session</span>
        </Button>
      </header>

      {/* Messages stream */}
      <div className="relative flex-1 overflow-y-auto">
        <div className="relative mx-auto max-w-4xl space-y-4 px-4 py-4 md:px-6">
          {displayMessages.map((msg, i) => (
            <ChatMessage
              key={`${i}-${msg.send_date ?? i}`}
              msg={msg}
              index={i}
              characterAvatar={`/api/v1/characters/thumbnail?id=${characterId}`}
              userName={(settings?.chat_name_your_name as string) || 'User'}
              characterName={character.name}
              description={character.description}
              personality={character.personality}
              scenario={character.scenario}
              first_mes={character.first_mes}
              mes_example={character.mes_example}
              creator_notes={character.creator_notes}
              system_prompt={character.system_prompt}
              post_history_instructions={character.post_history_instructions}
            />
          ))}
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
                <Loader2 className="text-ember h-3 w-3 animate-spin" />
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
