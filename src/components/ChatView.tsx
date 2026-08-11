import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { useAppStore, useChatStore, useGenerationStore, PARAM_KEYS } from '@/lib/stores';
import {
  apiGet,
  apiPost,
  streamChat,
  streamTextCompletion,
  flattenMessagesToPrompt,
  getInstructStoppingSequences,
  runGenerationInterceptors,
} from '@/lib/api';
import type { StreamChatRequest, InstructFlattenParams } from '@/lib/api';
import { cn, frostedGlass } from '@/lib/utils';
import { emit } from '@/lib/extensionEventBus';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useResolvedPersona } from '@/hooks/useResolvedPersona';
import { setChatPersona } from '@/lib/api';
import { PersonaSelector } from '@/components/PersonaSelector';

import type { ChatMessage as ChatMessageType } from '@/shared/types/chat';
import type { Character } from '@/shared/types/character';
import type { TextOptions } from '@/shared/types/text-options';
import { parseThinkingChunks } from '@/lib/parseThinking';
import type { ReasoningSettings } from '@/shared/types/reasoning';
import { GENERATION_TIPS, getRandomTip } from '@/lib/generationTips';

type CharacterWithId = Character & { id: number };

/** Remap chat-completion-only sources to a text-completion equivalent. */
function textCompletionSource(chatSource: string): string {
  if (chatSource === 'openai') return 'llamacpp';
  return chatSource;
}

function escapeMarkdownCharacters(text: string, escapeStrings: string): string {
  if (!escapeStrings) return text;
  return escapeStrings
    .split(',')
    .filter((token) => token.length > 0)
    .reduce((result, token) => {
      let escaped = result;
      for (const char of token) {
        escaped = escaped.split(char).join(`\\${char}`);
      }
      return escaped;
    }, text);
}

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
  const activeChatId = useChatStore((s) => s.activeChatId);
  const messages = useChatStore((s) => s.messages);
  const isGenerating = useChatStore((s) => s.isGenerating);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const streamingThinking = useChatStore((s) => s.streamingThinking);
  const isThinkingStream = useChatStore((s) => s.isThinkingStream);
  const streamingSendDate = useChatStore((s) => s.streamingSendDate);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const setMessages = useChatStore((s) => s.setMessages);
  const addMessage = useChatStore((s) => s.addMessage);
  const removeMessage = useChatStore((s) => s.removeMessage);
  const setStreamingContent = useChatStore((s) => s.setStreamingContent);
  const setStreamingThinking = useChatStore((s) => s.setStreamingThinking);
  const setIsThinkingStream = useChatStore((s) => s.setIsThinkingStream);
  const appendStreamingContent = useChatStore((s) => s.appendStreamingContent);
  const startStreaming = useChatStore((s) => s.startStreaming);
  const commitStreaming = useChatStore((s) => s.commitStreaming);
  const setIsGenerating = useChatStore((s) => s.setIsGenerating);
  const clearChat = useChatStore((s) => s.clearChat);
  const activeGreetingIndex = useChatStore((s) => s.activeGreetingIndex);
  const setActiveGreetingIndex = useChatStore((s) => s.setActiveGreetingIndex);

  const genMaxContext = useGenerationStore((s) => s.max_context);
  const genStop = useGenerationStore((s) => s.stop);
  const genModel = useGenerationStore((s) => s.model);
  const genMode = useGenerationStore((s) => s.mode);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const fullContentRef = useRef('');
  const isRegeneratingRef = useRef(false);
  // Tracks when the thinking stream began so we can compute its duration on
  // commit. Ref (not state) to avoid re-render loops during streaming.
  const thinkingStartTimeRef = useRef<number | null>(null);
  // Set when we've locally mutated messages (delete, reorder) so the query
  // sync effect doesn't overwrite our local state with stale server data.
  const localModificationsRef = useRef(false);
  const localModificationsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to hold latest analyzeOutfitChanges so stopGeneration doesn't need it in deps.
  const analyzeOutfitChangesRef = useRef<
    ((message: string, charName: string) => Promise<void>) | null
  >(null);
  const outfitDataRef = useRef<typeof outfitData>(null);

  const [tipIndex, setTipIndex] = useState(() => getRandomTip(-1));
  const [tipPhase, setTipPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [placeholderVisible, setPlaceholderVisible] = useState(false);

  useEffect(() => {
    if (!isGenerating) {
      setPlaceholderVisible(false);
      setTipPhase('enter');
      return;
    }
    setTipIndex(getRandomTip(-1));
    setTipPhase('enter');
    requestAnimationFrame(() => setPlaceholderVisible(true));
    const intervalId = setInterval(() => {
      setTipPhase('exit');
      setTimeout(() => {
        setTipIndex((prev) => getRandomTip(prev));
        setTipPhase('enter');
      }, 400);
    }, 3500);
    return () => clearInterval(intervalId);
  }, [isGenerating]);

  const streamingEnabled = useAppStore((s) => s.streamingEnabled);
  const smoothStreaming = useAppStore((s) => s.smoothStreaming);

  // Drip buffer state: pending chunks waiting to be released to the UI at a
  // pace determined by `smoothStreaming`. 0 = no pacing (release immediately).
  // Higher = slower drip rate (smoother reveal).
  // `lastDripAt` bounds worst-case display lag when the tab is backgrounded
  // and setTimeout is throttled into oblivion: if a queued drip callback has
  // not fired within 1.5x its own delay, the next incoming chunk flushes
  // pending directly rather than waiting on the throttled scheduler.
  const dripRef = useRef<{
    pending: string;
    timer: ReturnType<typeof setTimeout> | null;
    bodyDripEmitted: number;
    thinkingSoFar: string | undefined;
    inThinking: boolean;
    lastDripAt: number;
  }>({
    pending: '',
    timer: null,
    bodyDripEmitted: 0,
    thinkingSoFar: undefined,
    inThinking: false,
    lastDripAt: 0,
  });

  const flushDrip = useCallback(() => {
    if (dripRef.current.timer) {
      clearTimeout(dripRef.current.timer);
      dripRef.current.timer = null;
    }
    if (dripRef.current.pending) {
      appendStreamingContent(dripRef.current.pending);
      dripRef.current.pending = '';
      dripRef.current.lastDripAt = Date.now();
    }
  }, [appendStreamingContent]);

  const resetDrip = useCallback(() => {
    if (dripRef.current.timer) {
      clearTimeout(dripRef.current.timer);
      dripRef.current.timer = null;
    }
    dripRef.current.pending = '';
    dripRef.current.bodyDripEmitted = 0;
    dripRef.current.thinkingSoFar = undefined;
    dripRef.current.inThinking = false;
    dripRef.current.lastDripAt = Date.now();
  }, []);

  const scheduleDrip = useCallback(() => {
    const { smoothStreaming } = useAppStore.getState();
    if (smoothStreaming <= 0) {
      flushDrip();
      return;
    }
    // If a drip is already scheduled but the tab was throttled (mobile FF
    // Android throttles backgrounded timers to ~1/min) and we have pending
    // data that has waited more than ~1.5x the intended delay, release it
    // immediately rather than letting the placeholder sit empty. This is the
    // visibilitychange-independent safeguard that keeps tokens flowing during
    // backgrounded/returning-to-focus streams.
    const delayMs = Math.round(smoothStreaming);
    if (
      dripRef.current.timer &&
      dripRef.current.lastDripAt &&
      Date.now() - dripRef.current.lastDripAt > delayMs * 1.5
    ) {
      flushDrip();
      return;
    }
    if (dripRef.current.timer) return;
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
      dripRef.current.lastDripAt = Date.now();
      if (dripRef.current.pending) {
        dripRef.current.timer = null;
        scheduleDripRef.current?.();
      } else {
        dripRef.current.timer = null;
      }
    }, delayMs);
  }, [appendStreamingContent, flushDrip]);

  const scheduleDripRef = useRef(scheduleDrip);
  scheduleDripRef.current = scheduleDrip;

  // When the browser tab is backgrounded, setTimeout gets throttled to ~1s.
  // On refocus, flush any accumulated drip text immediately and scroll to
  // bottom so the user sees the latest content without a jarring delay.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        flushDrip();
        if (isNearBottomRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [flushDrip]);

  const { data: character, isLoading: charLoading, isError: charError } = useQuery<CharacterWithId>({
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
    const hasReasoning = !!(r?.prefix && r.suffix);
    return r
      ? {
          prefix: r.prefix ?? '',
          suffix: r.suffix ?? '',
          separator: r.separator ?? '\n',
          autoParse: r.autoParse ?? hasReasoning,
          autoExpand: r.autoExpand ?? false,
          showHidden: r.showHidden ?? hasReasoning,
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

  const [outfitData, setOutfitData] = useState<{
    disabled?: boolean;
    items?: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    if (!characterId) return;
    const key = `worldcore/outfit/${characterId}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        setOutfitData({
          disabled: data.disabled ?? false,
          items: data.items ?? {},
        });
      } else {
        setOutfitData(null);
      }
    } catch {
      setOutfitData(null);
    }
  }, [characterId]);

  useEffect(() => {
    outfitDataRef.current = outfitData;
  }, [outfitData]);

  const textOptions = useMemo(() => {
    const to = (settings as { textOptions?: TextOptions } | undefined)?.textOptions;
    if (!to) return null;
    const syspromptEnabled = to.sysprompt?.enabled ?? true;
    const instructEnabled = to.instruct?.enabled ?? false;

    const sysOpts = syspromptEnabled
      ? {
          systemPromptOverride: to.sysprompt?.content,
          jailbreakPromptOverride: to.sysprompt?.postHistoryInstructions,
        }
      : { systemPromptOverride: undefined, jailbreakPromptOverride: undefined };

    if (!instructEnabled || !to.instruct) {
      return {
        ...sysOpts,
        instruct: undefined,
        stoppingStrings: to.stoppingStrings,
        startReplyWith: to.startReplyWith,
        markdownEscapeStrings: to.markdownEscapeStrings,
        context: to.context,
        tokenPadding: to.tokenPadding,
      };
    }

    return {
      ...sysOpts,
      instruct: to.instruct,
      stoppingStrings: to.stoppingStrings,
      startReplyWith: to.startReplyWith,
      markdownEscapeStrings: to.markdownEscapeStrings,
      context: to.context,
      tokenPadding: to.tokenPadding,
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
    if (chatData?.messages && !localModificationsRef.current) {
      setMessages(chatData.messages);
    }
  }, [chatData?.messages, setMessages]);

  useEffect(() => {
    localModificationsRef.current = false;
  }, [activeChatId]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Consider "near bottom" if within 100px of the bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: isGenerating ? 'instant' : 'smooth' });
    }
  }, [messages, streamingContent, isGenerating]);

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

  const stopGeneration = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    flushDrip();
    setIsGenerating(false);
    emit('generation_stopped', { characterId });

    if (isRegeneratingRef.current) {
      setStreamingContent('');
      setStreamingThinking(undefined);
      setIsThinkingStream(false);
    } else if (streamingContent || fullContentRef.current) {
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

      if (activeChatId) {
        const latestMessages = useChatStore.getState().messages;
        const committedMsg = latestMessages[latestMessages.length - 1];
        if (committedMsg && !committedMsg.is_user) {
          // Optimistic commit: hold the sync effect until the server has
          // persisted the stopped-stream message.
          localModificationsRef.current = true;
          if (localModificationsTimerRef.current) {
            clearTimeout(localModificationsTimerRef.current);
            localModificationsTimerRef.current = null;
          }
          try {
            await apiPost('/chats/message', {
              fileId: activeChatId,
              action: 'append',
              message: committedMsg,
            });
            await queryClient.invalidateQueries({ queryKey: ['/api/v1/chats/get'] });
          } finally {
            localModificationsTimerRef.current = setTimeout(() => {
              localModificationsRef.current = false;
              localModificationsTimerRef.current = null;
            }, 0);
          }

          if (outfitDataRef.current && !outfitDataRef.current.disabled && character) {
            analyzeOutfitChangesRef.current?.(committedMsg.mes, character.name);
          }
        }
      }
    }
  }, [
    abortRef,
    streamingContent,
    character,
    activeChatId,
    setIsGenerating,
    commitStreaming,
    flushDrip,
    resetDrip,
    reasoningSettings,
    setStreamingContent,
    setStreamingThinking,
    setIsThinkingStream,
    queryClient,
    characterId,
  ]);

  const handleGreetingChange = useCallback(
    (newIndex: number) => {
      if (!character) return;

      setActiveGreetingIndex(newIndex);

      const greetingText =
        newIndex === 0
          ? character.first_mes
          : (character.alternate_greetings?.[newIndex - 1] ?? character.first_mes);

      if (!greetingText) return;

      const currentMessages = useChatStore.getState().messages;
      const firstMsg = currentMessages[0];
      if (currentMessages.length > 0 && firstMsg && !firstMsg.is_user) {
        const updatedFirstMsg: ChatMessageType = {
          name: firstMsg.name,
          is_user: false,
          mes: greetingText,
          send_date: new Date().toISOString(),
          extra: firstMsg.extra ?? {},
        };
        const newMessages = [updatedFirstMsg, ...currentMessages.slice(1)];
        setMessages(newMessages);

        if (activeChatId) {
          void apiPost('/chats/message', {
            fileId: activeChatId,
            action: 'edit',
            index: 0,
            updates: updatedFirstMsg,
          });
        }
      }

      try {
        const key = `worldcore/outfit/${characterId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const outfitData = JSON.parse(raw) as {
            presets?: Array<{
              id: string;
              greetingIndex?: number;
              items: Record<string, string>;
              regions?: unknown[];
              customPanels?: unknown[];
            }>;
            items?: Record<string, string>;
            regions?: unknown[];
            customPanels?: unknown[];
            disabled?: boolean;
          };

          if (!outfitData.disabled && outfitData.presets) {
            const matchingPreset = outfitData.presets.find((p) => p.greetingIndex === newIndex);
            if (matchingPreset) {
              const merged = { ...(outfitData.items ?? {}), ...matchingPreset.items };
              const updatedOutfit = {
                ...outfitData,
                items: merged,
                regions: matchingPreset.regions ?? outfitData.regions,
                customPanels: matchingPreset.customPanels ?? outfitData.customPanels,
              };
              localStorage.setItem(key, JSON.stringify(updatedOutfit));
              setOutfitData({
                disabled: updatedOutfit.disabled ?? false,
                items: updatedOutfit.items ?? {},
              });
            }
          }
        }
      } catch {
        // empty — outfit errors are non-critical
      }
    },
    [character, characterId, activeChatId, setMessages, setActiveGreetingIndex],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!character || !activeChatId || useChatStore.getState().isGenerating) return;

      const userName = resolvedPersona.name;
      const userMsg: ChatMessageType = {
        name: userName,
        is_user: true,
        mes: text,
        send_date: new Date().toISOString(),
        extra: {},
      };

      // Mark local modifications so the chat-data sync effect (which fires when
      // appendMessageMutation's onSuccess invalidates /chats/get) does NOT
      // overwrite our optimistic message with stale server data mid-generation.
      // Reset below once the server has actually persisted the message.
      localModificationsRef.current = true;
      if (localModificationsTimerRef.current) {
        clearTimeout(localModificationsTimerRef.current);
        localModificationsTimerRef.current = null;
      }
      addMessage(userMsg);
      try {
        await appendMessageMutation.mutateAsync({ fileId: activeChatId, message: userMsg });
      } finally {
        localModificationsTimerRef.current = setTimeout(() => {
          localModificationsRef.current = false;
          localModificationsTimerRef.current = null;
        }, 0);
      }

      const allMessages = [...useChatStore.getState().messages, userMsg];

      const maxContext = genMaxContext ?? 8192;
      const tokenPadding = textOptions?.tokenPadding ?? 1024;

      const promptBuildResult = await apiPost<{
        messages: Array<{ role: string; content: string; name?: string }>;
        tokenCount: number;
        stopStrings?: string[];
        needsSummarization?: boolean;
        messagesToSummarize?: ChatMessageType[];
      }>('/prompt-builder/build', {
        characterId: characterId,
        messages: allMessages,
        userName: userName,
        includeExamples: true,
        systemPromptOverride: textOptions?.systemPromptOverride,
        jailbreakPromptOverride: textOptions?.jailbreakPromptOverride,
        instruct: textOptions?.instruct,
        reasoning: reasoningSettings,
        context: textOptions?.context,
        maxContext,
        tokenPadding,
        chatId: activeChatId ?? undefined,
        outfit: outfitData ?? undefined,
      });

      let promptMessages = promptBuildResult.messages;

      if (promptBuildResult.needsSummarization && promptBuildResult.messagesToSummarize) {
        try {
          const summarizeResult = await apiPost<{
            summary: string;
            summarizedCount: number;
            keptCount: number;
          }>('/summarize', {
            messages: promptBuildResult.messagesToSummarize,
            charName: character.name,
            userName: userName,
          });

          if (summarizeResult?.summary) {
            const rebuiltResult = await apiPost<{
              messages: Array<{ role: string; content: string; name?: string }>;
              tokenCount: number;
              stopStrings?: string[];
            }>('/prompt-builder/build', {
              characterId: characterId,
              messages: allMessages,
              userName: userName,
              includeExamples: true,
              systemPromptOverride: textOptions?.systemPromptOverride,
              jailbreakPromptOverride: textOptions?.jailbreakPromptOverride,
              instruct: textOptions?.instruct,
              reasoning: reasoningSettings,
              context: textOptions?.context,
              maxContext,
              tokenPadding,
              summary: summarizeResult.summary,
              chatId: activeChatId ?? undefined,
              outfit: outfitData ?? undefined,
            });
            promptMessages = rebuiltResult.messages;
          }
        } catch (err) {
          console.warn('[ChatView] Summarization failed, using truncated context:', err);
        }
      }

      const source = (settings?.chat_completion_source as string) || 'openai';
      const model = (settings?.chat_completion_model as string) || 'gpt-3.5-turbo';
      const reverseProxy = (settings?.reverse_proxy as string) || undefined;

      setIsGenerating(true);
      emit('generation_started', { characterId });
      setStreamingContent('');
      setStreamingThinking(undefined);
      setIsThinkingStream(false);
      startStreaming();
      isRegeneratingRef.current = false;
      resetDrip();

      abortRef.current = new AbortController();

      const genParams: Record<string, unknown> = {
        streaming: streamingEnabled,
      };
      for (const key of PARAM_KEYS) {
        if (key === 'mode' || key === 'preset') continue;
        const val = useGenerationStore.getState()[key];
        if (typeof val === 'function') continue;
        if (key === 'stop') {
          genParams.stop = (val as string[]).length > 0 ? val : undefined;
        } else {
          genParams[key] = val;
        }
      }

      // Stop strings MUST include the instruct role sequences (outputSequence,
      // inputSequence, systemSequence, etc.), not just stopSequence + suffixes.
      // Without them llama.cpp keeps generating past "<|turn>model\n" and the
      // partial stop-token fragments leak into the rendered text as garbled
      // fragments like "s *Amalia Amalaia". Mirrors SillyTavern's
      // getInstructStoppingSequences (public/scripts/instruct-mode.js:301).
      const mergedStop = [...genStop];
      const charName = character.name;
      const instructStops = getInstructStoppingSequences(textOptions?.instruct, {
        userName,
        characterName: charName,
      });
      for (const seq of instructStops) {
        if (seq && !mergedStop.includes(seq)) mergedStop.push(seq);
      }
      if (textOptions?.instruct?.sequencesAsStopStrings) {
        const inst = textOptions.instruct;
        for (const seq of [
          inst.outputSuffix,
          inst.inputSuffix,
          inst.systemSuffix,
          inst.separatorSequence,
        ].filter(Boolean)) {
          if (seq && !mergedStop.includes(seq)) mergedStop.push(seq);
        }
      }
      if (textOptions?.stoppingStrings) {
        let parsedStops: string[] = [];
        try {
          const decoded = JSON.parse(textOptions.stoppingStrings);
          if (Array.isArray(decoded)) {
            parsedStops = decoded.filter((s): s is string => typeof s === 'string');
          }
        } catch {
          parsedStops = [];
        }
        for (const s of parsedStops) {
          if (s && !mergedStop.includes(s)) mergedStop.push(s);
        }
      }
      if (promptBuildResult.stopStrings?.length) {
        for (const stopString of promptBuildResult.stopStrings) {
          if (stopString && !mergedStop.includes(stopString)) mergedStop.push(stopString);
        }
      }
      genParams.stop = mergedStop.length > 0 ? mergedStop : undefined;

      let fullContent = '';
      fullContentRef.current = '';
      const startReplyWith = textOptions?.startReplyWith ?? '';
      const markdownEscapeStrings = textOptions?.markdownEscapeStrings ?? '';
      try {
        const interceptorRequest: StreamChatRequest = {
          chat_completion_source: source,
          model: genModel || model,
          messages: promptMessages,
          reverse_proxy: reverseProxy,
          ...genParams,
        };

        const interceptedRequest = await runGenerationInterceptors(
          interceptorRequest,
          abortRef.current!.signal,
        );
        if (!interceptedRequest) {
          return;
        }

        let generator: AsyncGenerator<string>;
        if (genMode === 'text') {
          let flatPrompt = flattenMessagesToPrompt(
            interceptedRequest.messages,
            textOptions?.instruct,
            textOptions?.context,
          );
          if (textOptions?.instruct?.enabled && textOptions.instruct.outputSequence) {
            flatPrompt += textOptions.instruct.outputSequence;
          }
          generator = streamTextCompletion(
            {
              text_completion_source: textCompletionSource(source),
              model: genModel || model,
              prompt: flatPrompt,
              max_context: genMaxContext,
              reverse_proxy: reverseProxy,
              ...genParams,
            },
            abortRef.current?.signal,
          );
        } else {
          generator = streamChat(interceptedRequest, abortRef.current?.signal);
        }

        let isFirstChunk = true;
        for await (const chunk of generator) {
          if (abortRef.current?.signal.aborted) break;
          const replyChunk = isFirstChunk && startReplyWith ? `${startReplyWith}${chunk}` : chunk;
          isFirstChunk = false;
          fullContent += replyChunk;
          fullContentRef.current = fullContent;
          emit('message_chunk_received', { chunk: replyChunk, index: messages.length + 1 });
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
              if (parsed.inThinking) {
                thinkingStartTimeRef.current = Date.now();
              }
            }
            if (currentSmooth > 0) {
              dripRef.current.pending += bodyChunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(bodyChunk);
            }
          } else {
            if (currentSmooth > 0) {
              dripRef.current.pending += replyChunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(replyChunk);
            }
          }
        }
        flushDrip();

        const aborted = !abortRef.current || abortRef.current.signal.aborted;
        if (aborted) return;

        if (fullContent) {
          let finalMes = fullContent;
          let finalThinking: string | undefined;
          if (reasoningSettings.autoParse && reasoningSettings.prefix && reasoningSettings.suffix) {
            const parsed = parseThinkingChunks(fullContent, reasoningSettings);
            finalMes = parsed.body;
            finalThinking = parsed.thinking;
          }
          if (markdownEscapeStrings) {
            finalMes = escapeMarkdownCharacters(finalMes, markdownEscapeStrings);
          }
          const thinkingDuration =
            thinkingStartTimeRef.current !== null
              ? Date.now() - thinkingStartTimeRef.current
              : undefined;
          thinkingStartTimeRef.current = null;
          const assistantMsg: ChatMessageType = {
            name: character.name,
            is_user: false,
            mes: finalMes,
            thinking: finalThinking,
            send_date: new Date().toISOString(),
            extra: thinkingDuration !== undefined ? { thinkingDuration } : {},
          };
          // Same optimistic-write guard as the user message above: the mutation's
          // onSuccess invalidates /chats/get, and the resulting refetch can beat
          // the server's persistence of this very message. Hold localModifications
          // until the refetch has settled so the sync effect cannot wipe the
          // committed assistant message.
          localModificationsRef.current = true;
          if (localModificationsTimerRef.current) {
            clearTimeout(localModificationsTimerRef.current);
            localModificationsTimerRef.current = null;
          }
          addMessage(assistantMsg);
          setStreamingContent('');
          setStreamingThinking(undefined);
          setIsThinkingStream(false);
          try {
            await appendMessageMutation.mutateAsync({
              fileId: activeChatId,
              message: assistantMsg,
            });
          } finally {
            localModificationsTimerRef.current = setTimeout(() => {
              localModificationsRef.current = false;
              localModificationsTimerRef.current = null;
            }, 0);
          }
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          console.error('Streaming error:', error);
          if (fullContent) {
            const thinkingDuration =
              thinkingStartTimeRef.current !== null
                ? Date.now() - thinkingStartTimeRef.current
                : undefined;
            thinkingStartTimeRef.current = null;
            const assistantMsg: ChatMessageType = {
              name: character.name,
              is_user: false,
              mes: markdownEscapeStrings
                ? escapeMarkdownCharacters(fullContent, markdownEscapeStrings)
                : fullContent,
              send_date: new Date().toISOString(),
              extra: thinkingDuration !== undefined ? { thinkingDuration } : {},
            };
            localModificationsRef.current = true;
            if (localModificationsTimerRef.current) {
              clearTimeout(localModificationsTimerRef.current);
              localModificationsTimerRef.current = null;
            }
            addMessage(assistantMsg);
            setStreamingContent('');
            setStreamingThinking(undefined);
            setIsThinkingStream(false);
            try {
              await appendMessageMutation.mutateAsync({
                fileId: activeChatId,
                message: assistantMsg,
              });
            } finally {
              localModificationsTimerRef.current = setTimeout(() => {
                localModificationsRef.current = false;
                localModificationsTimerRef.current = null;
              }, 0);
            }
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
      resolvedPersona,
      addMessage,
      appendMessageMutation,
      setIsGenerating,
      genMode,
      genModel,
      genMaxContext,
      genStop,
      setStreamingContent,
      setStreamingThinking,
      setIsThinkingStream,
      appendStreamingContent,
      streamingEnabled,
      smoothStreaming,
      scheduleDrip,
      flushDrip,
      resetDrip,
      reasoningSettings,
      fullContentRef,
    ],
  );

  const handleNewChat = useCallback(() => {
    if (!character) return;
    const oldChatId = activeChatId;
    clearChat();
    createChatMutation.mutate(character.name, {
      onSuccess: () => {
        if (oldChatId) {
          apiPost('/chats/delete', { fileId: oldChatId })
            .then(() => queryClient.invalidateQueries({ queryKey: ['/api/v1/chats/get'] }))
            .catch((e) => {
              console.error('Failed to delete old chat session:', e);
            });
        }
      },
    });
  }, [character, clearChat, createChatMutation, activeChatId, queryClient]);

  const handleCopyMessage = useCallback((text: string) => {
    navigator.clipboard.writeText(text).catch(() => {
      console.error('Failed to copy message');
    });
  }, []);

  const analyzeOutfitChanges = useCallback(
    async (message: string, charName: string) => {
      if (!outfitData || outfitData.disabled) return;

      try {
        const result = await apiPost<{
          changes: Array<{ slot: string; action: string; description: string }>;
          updatedOutfit: Record<string, string>;
        }>('/outfit-analyzer/analyze', {
          message,
          charName,
          currentOutfit: outfitData.items ?? {},
        });

        if (result.changes.length > 0) {
          const newOutfitData = {
            ...outfitData,
            items: result.updatedOutfit,
          };
          setOutfitData(newOutfitData);

          const key = `worldcore/outfit/${characterId}`;
          localStorage.setItem(key, JSON.stringify(newOutfitData));
        }
      } catch (err) {
        console.warn('[ChatView] Outfit analysis failed:', err);
      }
    },
    [outfitData, characterId],
  );

  useEffect(() => {
    analyzeOutfitChangesRef.current = analyzeOutfitChanges;
  }, [analyzeOutfitChanges]);

  const handleEditMessage = useCallback(
    async (index: number, newText: string) => {
      if (!activeChatId || index >= messages.length) return;
      const msg = messages[index];
      if (!msg) return;
      if (newText.trim().length === 0) return; // ignore empty edits — keep previous message text

      localModificationsRef.current = true;
      if (localModificationsTimerRef.current) {
        clearTimeout(localModificationsTimerRef.current);
        localModificationsTimerRef.current = null;
      }
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
        await queryClient.invalidateQueries({ queryKey: ['/api/v1/chats/get'] });
      } catch (err) {
        console.error('Failed to edit message:', err);
      } finally {
        localModificationsTimerRef.current = setTimeout(() => {
          localModificationsRef.current = false;
          localModificationsTimerRef.current = null;
        }, 0);
      }
    },
    [activeChatId, messages, setMessages],
  );

  const handleDeleteMessage = useCallback(
    async (index: number) => {
      if (!activeChatId || index < 0 || index >= messages.length) return;
      if (index === 0) return; // never delete the greeting (first message)

      // Guard the optimistic local removal against the /chats/get sync effect
      // until the server delete + refetch settles. Mirrors the sendMessage/
      // stopGeneration guard: without invalidation, the stale cache re-syncs the
      // deleted message when ChatView unmounts (Connections drawer) and remounts.
      localModificationsRef.current = true;
      if (localModificationsTimerRef.current) {
        clearTimeout(localModificationsTimerRef.current);
        localModificationsTimerRef.current = null;
      }
      removeMessage(index);
      emit('message_removed', { index });

      try {
        await apiPost('/chats/message', {
          fileId: activeChatId,
          action: 'delete',
          index,
        });
        await queryClient.invalidateQueries({ queryKey: ['/api/v1/chats/get'] });
      } catch (err) {
        console.error('Failed to delete message:', err);
      } finally {
        localModificationsTimerRef.current = setTimeout(() => {
          localModificationsRef.current = false;
          localModificationsTimerRef.current = null;
        }, 0);
      }
    },
    [activeChatId, messages, removeMessage, queryClient],
  );

  const handleRegenerate = useCallback(
    async (index: number) => {
      if (!character || !activeChatId || useChatStore.getState().isGenerating) return;
      if (index < 0 || index >= messages.length) return;

      const userName = resolvedPersona.name;
      const truncatedMessages = useChatStore.getState().messages.slice(0, index);

      setIsGenerating(true);
      emit('generation_started', { characterId });
      setStreamingContent('');
      setStreamingThinking(undefined);
      setIsThinkingStream(false);
      startStreaming();
      isRegeneratingRef.current = true;
      resetDrip();
      abortRef.current = new AbortController();

      const genParams: Record<string, unknown> = {
        streaming: streamingEnabled,
      };
      for (const key of PARAM_KEYS) {
        if (key === 'mode' || key === 'preset') continue;
        const val = useGenerationStore.getState()[key];
        if (typeof val === 'function') continue;
        if (key === 'stop') {
          genParams.stop = (val as string[]).length > 0 ? val : undefined;
        } else {
          genParams[key] = val;
        }
      }

      // Stop strings MUST include the instruct role sequences (outputSequence,
      // inputSequence, systemSequence, etc.), not just stopSequence + suffixes.
      // Without them llama.cpp keeps generating past "<|turn>model\n" and the
      // partial stop-token fragments leak into the rendered text as garbled
      // fragments like "s *Amalia Amalaia". Mirrors SillyTavern's
      // getInstructStoppingSequences (public/scripts/instruct-mode.js:301).
      const mergedStop = [...genStop];
      const charName = character?.name ?? '';
      const instructStops = getInstructStoppingSequences(textOptions?.instruct, {
        userName,
        characterName: charName,
      });
      for (const seq of instructStops) {
        if (seq && !mergedStop.includes(seq)) mergedStop.push(seq);
      }
      if (textOptions?.instruct?.sequencesAsStopStrings) {
        const inst = textOptions.instruct;
        for (const seq of [
          inst.outputSuffix,
          inst.inputSuffix,
          inst.systemSuffix,
          inst.separatorSequence,
        ].filter(Boolean)) {
          if (seq && !mergedStop.includes(seq)) mergedStop.push(seq);
        }
      }
      if (textOptions?.stoppingStrings) {
        let parsedStops: string[] = [];
        try {
          const decoded = JSON.parse(textOptions.stoppingStrings);
          if (Array.isArray(decoded)) {
            parsedStops = decoded.filter((s): s is string => typeof s === 'string');
          }
        } catch {
          parsedStops = [];
        }
        for (const s of parsedStops) {
          if (s && !mergedStop.includes(s)) mergedStop.push(s);
        }
      }
      if (textOptions?.context?.singleLine && !mergedStop.includes('\n')) {
        mergedStop.push('\n');
      }
      genParams.stop = mergedStop.length > 0 ? mergedStop : undefined;

      const maxContext = genMaxContext ?? 8192;
      const tokenPadding = textOptions?.tokenPadding ?? 1024;

      const promptBuildResult = await apiPost<{
        messages: Array<{ role: string; content: string; name?: string }>;
        tokenCount: number;
        stopStrings?: string[];
        needsSummarization?: boolean;
        messagesToSummarize?: ChatMessageType[];
      }>('/prompt-builder/build', {
        characterId: characterId,
        messages: truncatedMessages,
        userName: userName,
        includeExamples: true,
        systemPromptOverride: textOptions?.systemPromptOverride,
        jailbreakPromptOverride: textOptions?.jailbreakPromptOverride,
        instruct: textOptions?.instruct,
        reasoning: reasoningSettings,
        context: textOptions?.context,
        maxContext,
        tokenPadding,
        chatId: activeChatId ?? undefined,
        outfit: outfitData ?? undefined,
      });

      let promptMessages = promptBuildResult.messages;

      if (promptBuildResult.needsSummarization && promptBuildResult.messagesToSummarize) {
        try {
          const summarizeResult = await apiPost<{
            summary: string;
            summarizedCount: number;
            keptCount: number;
          }>('/summarize', {
            messages: promptBuildResult.messagesToSummarize,
            charName: character.name,
            userName: userName,
          });

          if (summarizeResult?.summary) {
            const rebuiltResult = await apiPost<{
              messages: Array<{ role: string; content: string; name?: string }>;
              tokenCount: number;
              stopStrings?: string[];
            }>('/prompt-builder/build', {
              characterId: characterId,
              messages: truncatedMessages,
              userName: userName,
              includeExamples: true,
              systemPromptOverride: textOptions?.systemPromptOverride,
              jailbreakPromptOverride: textOptions?.jailbreakPromptOverride,
              instruct: textOptions?.instruct,
              reasoning: reasoningSettings,
              context: textOptions?.context,
              maxContext,
              tokenPadding,
              summary: summarizeResult.summary,
              chatId: activeChatId ?? undefined,
              outfit: outfitData ?? undefined,
            });
            promptMessages = rebuiltResult.messages;
          }
        } catch {}
      }

      if (promptBuildResult.stopStrings?.length) {
        for (const stopString of promptBuildResult.stopStrings) {
          if (stopString && !mergedStop.includes(stopString)) mergedStop.push(stopString);
        }
      }
      genParams.stop = mergedStop.length > 0 ? mergedStop : undefined;

      let fullContent = '';
      fullContentRef.current = '';
      const startReplyWith = textOptions?.startReplyWith ?? '';
      const markdownEscapeStrings = textOptions?.markdownEscapeStrings ?? '';
      try {
        const interceptorRequest: StreamChatRequest = {
          chat_completion_source: (settings?.chat_completion_source as string) || 'openai',
          model: genModel || (settings?.chat_completion_model as string) || 'gpt-3.5-turbo',
          messages: promptMessages,
          reverse_proxy: (settings?.reverse_proxy as string) || undefined,
          ...genParams,
        };

        const interceptedRequest = await runGenerationInterceptors(
          interceptorRequest,
          abortRef.current!.signal,
        );
        if (!interceptedRequest) {
          return;
        }

        const source = (settings?.chat_completion_source as string) || 'openai';
        let generator: AsyncGenerator<string>;
        if (genMode === 'text') {
          let flatPrompt = flattenMessagesToPrompt(
            interceptedRequest.messages,
            textOptions?.instruct,
            textOptions?.context,
          );
          if (textOptions?.instruct?.enabled && textOptions.instruct.outputSequence) {
            flatPrompt += textOptions.instruct.outputSequence;
          }
          generator = streamTextCompletion(
            {
              text_completion_source: textCompletionSource(source),
              model: genModel || (settings?.chat_completion_model as string) || 'gpt-3.5-turbo',
              prompt: flatPrompt,
              max_context: genMaxContext,
              reverse_proxy: (settings?.reverse_proxy as string) || undefined,
              ...genParams,
            },
            abortRef.current?.signal,
          );
        } else {
          generator = streamChat(interceptedRequest, abortRef.current?.signal);
        }

        let isFirstChunk = true;
        for await (const chunk of generator) {
          if (abortRef.current?.signal.aborted) break;
          const replyChunk = isFirstChunk && startReplyWith ? `${startReplyWith}${chunk}` : chunk;
          isFirstChunk = false;
          fullContent += replyChunk;
          fullContentRef.current = fullContent;
          emit('message_chunk_received', { chunk: replyChunk, index: messages.length + 1 });
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
              if (parsed.inThinking) {
                thinkingStartTimeRef.current = Date.now();
              }
            }
            if (currentSmooth > 0) {
              dripRef.current.pending += bodyChunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(bodyChunk);
            }
          } else {
            if (currentSmooth > 0) {
              dripRef.current.pending += replyChunk;
              if (!dripRef.current.timer) scheduleDrip();
            } else {
              appendStreamingContent(replyChunk);
            }
          }
        }
        flushDrip();

        const aborted = !abortRef.current || abortRef.current.signal.aborted;
        if (aborted) return;

        if (fullContent) {
          let finalMes = fullContent;
          let finalThinking: string | undefined;
          if (reasoningSettings.autoParse && reasoningSettings.prefix && reasoningSettings.suffix) {
            const parsed = parseThinkingChunks(fullContent, reasoningSettings);
            finalMes = parsed.body;
            finalThinking = parsed.thinking;
          }
          if (markdownEscapeStrings) {
            finalMes = escapeMarkdownCharacters(finalMes, markdownEscapeStrings);
          }
          const thinkingDuration =
            thinkingStartTimeRef.current !== null
              ? Date.now() - thinkingStartTimeRef.current
              : undefined;
          thinkingStartTimeRef.current = null;
          const assistantMsg: ChatMessageType = {
            name: character.name,
            is_user: false,
            mes: finalMes,
            thinking: finalThinking,
            send_date: new Date().toISOString(),
            extra: thinkingDuration !== undefined ? { thinkingDuration } : {},
          };
          // Delete the old message at `index` from the server before appending
          // the replacement. Without this, the server chat file accumulates
          // orphaned messages that reappear on next page load.
          try {
            await apiPost('/chats/message', {
              fileId: activeChatId,
              action: 'delete',
              index,
            });
          } catch {
            // Non-fatal: local state is already correct via setMessages below.
          }
          const newMessages = [...truncatedMessages, assistantMsg];
          // Guard the in-flight regen against the /chats/get sync effect: the
          // prior sendMessage's invalidation can race with this commit.
          localModificationsRef.current = true;
          if (localModificationsTimerRef.current) {
            clearTimeout(localModificationsTimerRef.current);
            localModificationsTimerRef.current = null;
          }
          setMessages(newMessages);
          setStreamingContent('');
          setStreamingThinking(undefined);
          setIsThinkingStream(false);
          try {
            await apiPost('/chats/message', {
              fileId: activeChatId,
              action: 'append',
              message: assistantMsg,
            });
          } finally {
            localModificationsTimerRef.current = setTimeout(() => {
              localModificationsRef.current = false;
              localModificationsTimerRef.current = null;
            }, 0);
          }
        }
      } catch (err) {
        const error = err as Error;
        if (error.name !== 'AbortError') {
          console.error('Regeneration error:', error);
        }
        // Clear stale streaming UI state on error so the user doesn't see
        // a ghost message with leftover content from a failed generation.
        setStreamingContent('');
        setStreamingThinking(undefined);
        setIsThinkingStream(false);
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
      resolvedPersona,
      setIsGenerating,
      setStreamingContent,
      setStreamingThinking,
      setIsThinkingStream,
      appendStreamingContent,
      setMessages,
      genMode,
      genModel,
      genMaxContext,
      genStop,
      streamingEnabled,
      smoothStreaming,
      scheduleDrip,
      flushDrip,
      resetDrip,
      reasoningSettings,
      fullContentRef,
    ],
  );

  const displayMessages = useMemo(
    () => [
      ...messages,
      ...(streamingContent || isThinkingStream || isGenerating
        ? [
            {
              name: character?.name ?? '',
              is_user: false,
              mes: streamingContent,
              thinking: streamingThinking,
              send_date: streamingSendDate,
              extra: {},
            } as ChatMessageType,
          ]
        : []),
    ],
    [
      messages,
      streamingContent,
      isThinkingStream,
      isGenerating,
      character?.name,
      streamingThinking,
      streamingSendDate,
    ],
  );

  if (charLoading) {
    return <LoadingSpinner size="lg" label="retrieving persona" className="h-full" />;
  }

  if (charError) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <span className="mono-tag text-destructive">Failed to load character</span>
          <p className="text-muted-foreground text-xs">Please try again or select a different character.</p>
        </div>
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

  return (
    <div className="flex h-full flex-col">
      {/* Forge session header */}
      <header
        className={cn(
          frostedGlass,
          'z-10 flex h-10 shrink-0 items-center justify-between gap-1 px-2 sm:h-14 sm:gap-2 sm:px-6 sm:px-10',
        )}
      >
        {/* Left: persona + character identity */}
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="border-ember/40 bg-ember/10 flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border sm:h-8 sm:w-8">
            {resolvedPersona.avatar ? (
              <img
                src={resolvedPersona.avatar}
                alt={resolvedPersona.name}
                className="h-5 w-5 rounded-full object-cover sm:h-8 sm:w-8"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="display-host text-ember text-[11px] font-semibold sm:text-[13px]">
                {resolvedPersona.name[0]?.toUpperCase() ?? 'U'}
              </span>
            )}
          </div>
          <div className="flex min-w-0 shrink-0 flex-col leading-tight">
            <span className="display-host text-ember/90 truncate text-[11px] font-medium sm:text-[13px]">
              {resolvedPersona.name}
            </span>
            <span className="text-muted-foreground/60 hidden truncate text-[10px] sm:block sm:text-[11px]">
              {character?.name ?? '—'}
            </span>
          </div>
        </div>

        {/* Right: controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
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
            className="h-6 shrink-0 px-1.5 sm:h-7 sm:px-3"
          >
            <MessageSquarePlus className="h-3 w-3" />
            <span className="mono-tag hidden sm:inline">New Session</span>
          </Button>
        </div>
      </header>

      {/* Messages stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="scroll-mobile relative flex-1 overflow-y-auto"
      >
        <div className="relative mx-auto max-w-6xl space-y-3 px-3 py-3 sm:space-y-4 sm:px-10 sm:py-4">
          {displayMessages.map((msg, i) => (
            <div
              key={`${i}-${msg.send_date ?? i}`}
              className="animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <ChatMessage
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
                isStreaming={isGenerating && i === displayMessages.length - 1}
                thinkingDuration={
                  typeof msg.extra?.thinkingDuration === 'number'
                    ? msg.extra.thinkingDuration
                    : undefined
                }
                alternateGreetings={character.alternate_greetings}
                activeGreetingIndex={activeGreetingIndex}
                onGreetingChange={handleGreetingChange}
              />
            </div>
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
              <div
                className={cn(
                  'bg-card border-border flex items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-[inset_0_1px_0_0_color-mix(in_oklch,var(--foreground)_5%,transparent)] transition-all duration-500',
                  placeholderVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
                )}
              >
                <LoadingSpinner size="sm" />
                <span
                  className={cn(
                    'mono-tag text-muted-foreground/65 transition-all duration-400',
                    tipPhase === 'exit' ? '-translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
                  )}
                >
                  {GENERATION_TIPS[tipIndex]}
                </span>
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
