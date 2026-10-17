'use client';

import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from '@assistant-ui/react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { vname } from '@/lib/format';
import { setState, toast, useStore } from '@/lib/store';
import type { ChatTurn } from '@/lib/types';
import { Icon } from './Icon';

/*
 * Chat with the agent about the variant on screen. assistant-ui draws the
 * thread and composer from unstyled primitives; variantly's server is the
 * whole backend: a message is POSTed, the server runs the agent in that
 * variant's worktree, its output streams back over the existing event stream
 * (`chat` events) and the finished turn lands in the snapshot. The change is
 * committed to the variant's branch, so keeping the variant keeps it.
 */

type Row = ChatTurn & { live?: string[] };

const toThread = (t: Row): ThreadMessageLike => ({
  id: t.id,
  role: t.role === 'user' ? 'user' : 'assistant',
  createdAt: new Date(t.at),
  content: [{ type: 'text', text: t.status === 'running' ? (t.live?.length ? t.live.slice(-6).join('\n') : 'Working on it…') : t.text }],
  ...(t.role === 'agent'
    ? {
        status:
          t.status === 'running'
            ? { type: 'running' as const }
            : t.status === 'failed'
              ? { type: 'incomplete' as const, reason: 'error' as const }
              : { type: 'complete' as const, reason: 'stop' as const },
        metadata: { custom: { files: t.files ?? [], failed: t.status === 'failed' } },
      }
    : {}),
});

const Text = ({ text }: { text: string }) => <p className="chat-text">{text}</p>;

const UserMessage = () => (
  <MessagePrimitive.Root className="chat-msg user">
    <MessagePrimitive.Parts components={{ Text }} />
  </MessagePrimitive.Root>
);

const AgentMessage = () => (
  <MessagePrimitive.Root className="chat-msg agent">
    <MessagePrimitive.Parts components={{ Text }} />
  </MessagePrimitive.Root>
);

const SUGGESTIONS = ['Make the hero headline bigger', 'Use a warmer accent colour', 'More space between sections'];

type ThreadProps = { n: number; turns: Row[]; running: boolean };

const Thread = ({ n, turns, running }: ThreadProps) => {
  const onNew = useCallback(
    async (m: AppendMessage) => {
      const text = m.content
        .filter((p) => p.type === 'text')
        .map((p) => (p as { text: string }).text)
        .join('\n')
        .trim();
      if (!text) return;
      try {
        await api('POST', `chat/${n}`, { message: text });
      } catch (err) {
        toast(err instanceof Error ? err.message : String(err), true);
      }
    },
    [n],
  );
  const runtime = useExternalStoreRuntime({ messages: turns, isRunning: running, convertMessage: toThread, onNew });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadPrimitive.Root className="chat-thread">
        <ThreadPrimitive.Viewport className="chat-viewport">
          <ThreadPrimitive.Empty>
            <div className="chat-empty">
              <p>
                Ask the agent for a change to <strong>{vname(n)}</strong>. It edits this variant only, and keeping the
                variant keeps the change.
              </p>
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <ThreadPrimitive.Suggestion key={s} prompt={s} send className="chat-suggestion">
                    {s}
                  </ThreadPrimitive.Suggestion>
                ))}
              </div>
            </div>
          </ThreadPrimitive.Empty>
          <ThreadPrimitive.Messages components={{ UserMessage, AssistantMessage: AgentMessage }} />
        </ThreadPrimitive.Viewport>
        <ComposerPrimitive.Root className="chat-composer">
          <ComposerPrimitive.Input
            className="chat-input"
            rows={1}
            autoFocus
            placeholder={running ? 'The agent is working…' : `Change something in ${vname(n)}`}
            aria-label={`Message the agent about ${vname(n)}`}
          />
          <ComposerPrimitive.Send className="chat-send" aria-label="Send">
            <Icon name="send" />
          </ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>
    </AssistantRuntimeProvider>
  );
};

/* The panel: one thread per variant, for the variant selected in the dock. */
const Chat = () => {
  const open = useStore((s) => s.chatOpen);
  const sel = useStore((s) => s.sel);
  const v = useStore((s) => s.snap?.variants.find((x) => x.n === s.sel) ?? null);
  const live = useStore((s) => s.chatLive);
  const turns = useMemo<Row[]>(() => (v?.chat ?? []).map((t) => ({ ...t, live: live[t.id] })), [v?.chat, live]);
  const running = turns.some((t) => t.status === 'running');
  const ready = typeof sel === 'number' && v?.status === 'done';

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="chat"
          aria-label="Chat with the agent"
          initial={{ x: 24, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        >
          <header className="chat-head">
            <strong>{ready ? `Chat · ${vname(sel)}` : 'Chat'}</strong>
            <button className="icon-btn" type="button" aria-label="Close chat" onClick={() => setState({ chatOpen: false })}>
              <Icon name="close" />
            </button>
          </header>
          {ready ? (
            <Thread key={sel} n={sel} turns={turns} running={running} />
          ) : (
            <p className="chat-empty">Pick a finished variant in the dock to chat with the agent about it.</p>
          )}
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export { Chat };
