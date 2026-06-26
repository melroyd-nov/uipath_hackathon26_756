import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  ConversationalAgent,
  MessageRole,
  SortOrder,
} from '@uipath/uipath-typescript/conversational-agent';
import type {
  AgentGetResponse,
  ConversationGetResponse,
  SessionStream,
} from '@uipath/uipath-typescript/conversational-agent';
import { useAuth } from './useAuth';
import { ARIA_FOLDER_ID, ARIA_AGENT_NAME, createAriaService } from '../api/aria';

export interface AriaChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface UseAriaChatOptions {
  restoreHistory?: boolean;
}

export function useAriaChat({ restoreHistory = true }: UseAriaChatOptions = {}) {
  const { sdk } = useAuth();

  // One ConversationalAgent service instance per SDK identity
  const service = useMemo(() => createAriaService(sdk), [sdk]);

  const [messages, setMessages] = useState<AriaChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentRef = useRef<AgentGetResponse | null>(null);
  const convRef = useRef<ConversationGetResponse | null>(null);
  const sessionRef = useRef<SessionStream | null>(null);
  // Maps pre-registered exchangeId → assistant message id so onExchangeStart can find it
  const pendingExchanges = useRef<Map<string, string>>(new Map());

  // Register all WebSocket event handlers on a session — called once per session
  const attachHandlers = useCallback((session: SessionStream) => {
    session.onExchangeStart((exchange) => {
      const assistantId = pendingExchanges.current.get(exchange.exchangeId);
      if (!assistantId) return;

      setIsStreaming(true);

      exchange.onMessageStart((message) => {
        if (!message.isAssistant) return;

        message.onContentPartStart((contentPart) => {
          if (!contentPart.isMarkdown && !contentPart.isText) return;

          contentPart.onChunk((chunk) => {
            if (!chunk.data) return;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk.data } : m,
              ),
            );
          });
        });
      });

      exchange.onExchangeEnd(() => {
        pendingExchanges.current.delete(exchange.exchangeId);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m)),
        );
        setIsStreaming(false);
      });
    });
  }, []);

  // Open a session on a conversation and attach handlers
  const openSession = useCallback(
    (conv: ConversationGetResponse): SessionStream => {
      const session = conv.startSession({ echo: true });
      sessionRef.current = session;
      attachHandlers(session);
      return session;
    },
    [attachHandlers],
  );

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      let step = 'loading agents';
      try {
        const agents = await service.getAll(ARIA_FOLDER_ID);
        if (cancelled) return;

        const agent = agents.find((a) => a.name === ARIA_AGENT_NAME) ?? null;
        if (!agent) {
          const available = agents.map((a) => a.name).join(', ') || 'none';
          setError(`Agent "${ARIA_AGENT_NAME}" not found in folder ${ARIA_FOLDER_ID}. Available: ${available}`);
          setIsReady(true);
          return;
        }
        agentRef.current = agent;

        let conv: ConversationGetResponse;

        if (restoreHistory) {
          step = 'listing conversations';
          const recent = await service.conversations.getAll({
            pageSize: 1,
            sort: SortOrder.Descending,
          });
          if (cancelled) return;

          if (recent.items.length > 0) {
            conv = recent.items[0];

            // Attempt history restore — fall back to fresh conversation if history is unreadable
            step = 'loading exchange history';
            try {
              const history = await conv.exchanges.getAll({
                pageSize: 50,
                exchangeSort: SortOrder.Ascending,
                messageSort: SortOrder.Ascending,
              });
              if (cancelled) return;

              const restored: AriaChatMessage[] = [];
              for (const exchange of history.items) {
                for (const msg of exchange.messages) {
                  if (msg.role === MessageRole.System) continue;
                  if (!msg.contentParts?.length) continue;
                  for (const part of msg.contentParts) {
                    const data = await part.getData();
                    if (typeof data === 'string' && data.trim()) {
                      restored.push({
                        id: `${msg.messageId}-${part.contentPartId}`,
                        role: msg.role === MessageRole.Assistant ? 'assistant' : 'user',
                        content: data,
                      });
                    }
                  }
                }
              }
              if (!cancelled) setMessages(restored);
            } catch {
              // Stale or incompatible conversation — start fresh
              step = 'creating conversation (history fallback)';
              conv = await agent.conversations.create({ label: 'Aria Chat' });
            }
          } else {
            step = 'creating conversation';
            conv = await agent.conversations.create({ label: 'Aria Chat' });
          }
        } else {
          step = 'creating conversation';
          conv = await agent.conversations.create({ label: 'Aria Chat' });
        }

        if (cancelled) return;
        convRef.current = conv;
        step = 'opening session';
        openSession(conv);
        setIsReady(true);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Failed at "${step}": ${msg}`);
          setIsReady(true);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      convRef.current?.endSession();
      sessionRef.current = null;
    };
  }, [service, restoreHistory, openSession]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !sessionRef.current) return;

      const assistantId = `assistant-${Date.now()}`;

      // Add user bubble + empty assistant placeholder immediately (typing dots via isStreaming)
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: 'user', content: trimmed },
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);
      setIsStreaming(true);

      // Pre-register BEFORE startExchange so onExchangeStart wires up the right bubble
      const exchangeId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
      pendingExchanges.current.set(exchangeId, assistantId);

      const exchange = sessionRef.current.startExchange({ exchangeId });
      const message = exchange.startMessage({ role: MessageRole.User });
      await message.sendContentPart({ data: trimmed });
      message.sendMessageEnd();
    },
    [isStreaming],
  );

  const clearChat = useCallback(async () => {
    if (!agentRef.current) return;

    convRef.current?.endSession();
    sessionRef.current = null;
    pendingExchanges.current.clear();
    setMessages([]);
    setIsStreaming(false);

    try {
      const conv = await agentRef.current.conversations.create({ label: 'Aria Chat' });
      convRef.current = conv;
      openSession(conv);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to start new conversation: ${msg}`);
    }
  }, [openSession]);

  return { messages, isStreaming, isReady, error, sendMessage, clearChat };
}
