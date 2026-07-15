import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useChatStore, useGenerationStore } from '@/lib/stores';
import { apiFetch, streamChat } from '@/lib/api';
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
      const res = await fetch('/api/v1/characters/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: characterId }),
      });
      if (!res.ok) throw new Error('Failed to fetch character');
      const data = await res.json();
      return (Array.isArray(data) ? data : (data.results ?? data.data ?? data)) as CharacterWithId;
    },
  });

  const { data: settings } = useQuery<SettingsData>({
    queryKey: ['/api/v1/settings/get'],
    queryFn: async () => {
      const res = await fetch('/api/v1/settings/get');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      return (Array.isArray(data) ? data : (data.results ?? data.data ?? data)) as SettingsData;
    },
  });

  const { data: chatData } = useQuery({
    queryKey: ['/api/v1/chats/get', activeChatId],
    queryFn: async () => {
      if (!activeChatId) return null;
      const res = await fetch('/api/v1/chats/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: activeChatId }),
      });
      if (!res.ok) throw new Error('Failed to fetch chat');
      return res.json() as Promise<{
        ok: boolean;
        messages: ChatMessageType[];
        metadata: Record<string, unknown>;
      }>;
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
      const res = await fetch('/api/v1/chats/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterName: charName, userName }),
      });
      if (!res.ok) throw new Error('Failed to create chat');
      const data = await res.json();
      return data.fileId as string;
    },
    onSuccess: (fileId) => {
      setActiveChat(fileId);
    },
  });

  const appendMessageMutation = useMutation({
    mutationFn: async ({ fileId, message }: { fileId: string; message: ChatMessageType }) => {
      const res = await fetch('/api/v1/chats/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, action: 'append', message }),
      });
      if (!res.ok) throw new Error('Failed to save message');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/v1/chats/get'] });
    },
  });

  const findExistingChat = useCallback(() => {
    if (!character) return;
    const charName = character.name;
    fetch('/api/v1/chats/listByCharacter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ characterName: charName }),
    })
      .then((r) => r.json())
      .then((data) => {
        const chats = Array.isArray(data) ? data : (data.results ?? data.data ?? data);
        if (Array.isArray(chats) && chats.length > 0) {
          const chat = chats[0] as { file_id: string };
          setActiveChat(chat.file_id);
        } else {
          createChatMutation.mutate(charName);
        }
      })
      .catch(() => {
        createChatMutation.mutate(charName);
      });
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

      const historyMessages = allMessages.map((m) => ({
        role: m.is_user ? 'user' : ('assistant' as const),
        content: m.mes,
        name: m.name,
      }));

      const systemPrompt: Array<{ role: string; content: string; name?: string }> = [];
      if (character.creator_notes) {
        systemPrompt.push({ role: 'system', content: character.creator_notes, name: 'System' });
      }
      if (character.system_prompt) {
        systemPrompt.push({ role: 'system', content: character.system_prompt, name: 'System' });
      }

      const charContext = [character.description, character.personality, character.scenario]
        .filter(Boolean)
        .join('\n\n');

      if (charContext) {
        systemPrompt.push({
          role: 'system',
          content: `You are ${character.name}. ${charContext}`,
          name: 'System',
        });
      }

      const promptMessages = [...systemPrompt, ...historyMessages];

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

  const msgCount = displayMessages.length;
  const sessionLabel = activeChatId?.slice(0, 8) ?? '—';

  return (
    <div className="flex h-full flex-col">
      {/* Forge session header */}
      <header
        className={cn(
          frostedGlass,
          'z-10 flex h-[68px] shrink-0 items-center justify-between px-5',
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative shrink-0">
            <div className="border-border bg-muted/40 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border">
              <img
                src={`/api/v1/characters/avatar?id=${character.id}`}
                alt={character.name}
                className="h-10 w-10 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <span
              aria-hidden
              className="border-ember/40 pointer-events-none absolute -inset-[2px] rounded-full border"
            />
          </div>
          <div className="min-w-0">
            <h3 className="display-host truncate text-[22px] leading-none tracking-tight">
              {character.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="mono-tag text-ember/80">FORGE SESSION</span>
              <span className="mono-tag text-muted-foreground/45">{`{ ${sessionLabel} }`}</span>
              <span className="bg-border h-px w-4" />
              <span className="mono-tag text-muted-foreground/55 tabular-nums">
                {String(msgCount).padStart(2, '0')} msgs
              </span>
              {isGenerating && (
                <>
                  <span className="bg-border h-px w-4" />
                  <span className="inline-flex items-center gap-1.5">
                    <span className="dot-hot" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                    <span className="mono-tag text-ember">generating</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          title="Start a new conversation"
          className="h-8"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span className="mono-tag">new session</span>
        </Button>
      </header>

      {/* Messages stream */}
      <div className="relative flex-1 overflow-y-auto">
        {/* faint horizontal rule ticks */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, transparent, transparent 71px, var(--foreground) 71px, var(--foreground) 72px)',
          }}
        />

        {msgCount === 0 ? (
          <div className="relative flex h-full items-center justify-center px-8">
            <div className="max-w-md text-center">
              <div className="relative mx-auto mb-5 h-16 w-16">
                <span
                  className="border-ember/30 absolute inset-0 rounded-full border"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 60%, color-mix(in oklch, var(--ember) 25%, transparent) 0%, transparent 70%)',
                  }}
                />
                <div className="border-border/60 ember-pulse absolute inset-1.5 flex items-center justify-center rounded-full border">
                  <span
                    className="display-host text-ember text-[32px] leading-none italic"
                    aria-hidden
                  >
                    ⌑
                  </span>
                </div>
              </div>
              <h4 className="display-host mb-1 text-[22px] tracking-tight">
                Forge {character.name}
              </h4>
              <p className="mono-tag text-muted-foreground/55 mb-4">
                anvil ready · submit first line
              </p>
              {character.first_mes && (
                <div className="border-border bg-muted/30 mt-4 rounded-sm border px-4 py-3 text-left">
                  <div className="mono-tag text-ember/70 mb-1.5">opening_line</div>
                  <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                    {character.first_mes}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative mx-auto max-w-3xl space-y-5 px-5 py-5 md:px-8">
            {displayMessages.map((msg, i) => (
              <ChatMessage
                key={`${i}-${msg.send_date ?? i}`}
                msg={msg}
                index={i}
                characterAvatar={`/api/v1/characters/avatar?id=${character.id}`}
              />
            ))}
            {isGenerating && !streamingContent && (
              <div className="flex justify-start gap-3">
                <div className="border-border bg-muted/40 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border">
                  <span className="dot-hot" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
                <div className="bg-muted/30 border-border flex items-center gap-2 rounded-sm border px-3 py-2">
                  <Loader2 className="text-ember h-3.5 w-3.5 animate-spin" />
                  <span className="mono-tag text-muted-foreground/65">stoking the engine</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
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
