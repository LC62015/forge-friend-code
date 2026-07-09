import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  Plus,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  Paperclip,
  Monitor,
  Settings,
  Send,
  SlidersHorizontal,
  Square,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LuaForge,
});

const STORAGE_KEY = "luaforge.messages.v1";

const SUGGESTIONS = [
  "Make a teleport script for a lobby",
  "Write a leaderstats module with saving",
  "Add a currency multiplier to a Roblox game",
  "Build a sword combat system",
];

const RECENT_STUB = [
  "Sword combat system",
  "Teleport script for lobby",
  "Leaderstats with saving",
  "Wave-based zombie survival",
];

function LuaForge() {
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInitialMessages(JSON.parse(raw) as UIMessage[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <div className="h-screen bg-background" />;
  }
  return <Chat initial={initialMessages} />;
}

function Chat({ initial }: { initial: UIMessage[] }) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [status]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const t = text.trim();
    if (!t || isBusy) return;
    sendMessage({ text: t });
    setInput("");
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(input);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  };

  const newChat = () => {
    setMessages([]);
    setInput("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-[260px] flex-col border-r border-border bg-sidebar md:flex">
        <button
          onClick={newChat}
          className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
        <div className="mt-3 flex-1 overflow-y-auto px-2">
          <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            Recent
          </p>
          {RECENT_STUB.map((r, i) => (
            <div
              key={r}
              className={`mb-0.5 cursor-pointer truncate rounded-md px-3 py-2 text-[13px] transition-colors ${
                i === 0
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              }`}
            >
              {r}
            </div>
          ))}
        </div>
        <footer className="border-t border-border px-3 py-3 text-[11px] text-muted-foreground">
          LuaForge · powered by Lovable AI
        </footer>
      </aside>

      {/* Main */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-2 border-b border-border px-4">
          <ForgeLogo className="h-5 w-5 text-primary" />
          <span className="font-semibold">LuaForge</span>
          <span className="text-xs text-muted-foreground">Roblox Luau AI</span>
          <button className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-card/40 px-2.5 py-1 text-xs text-foreground/80 transition-colors hover:bg-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Gemini
            <ChevronDown className="h-3 w-3" />
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              <EmptyState onPick={submit} />
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} />
                ))}
                {status === "submitted" && <ThinkingBubble />}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-card/30 px-3 py-2 text-xs text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Gameplay constraints</span>
              <span className="ml-auto text-[10px] opacity-60">optional</span>
            </div>

            <div className="rounded-2xl border border-border bg-card p-2 shadow-lg">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Message LuaForge… (Enter to send, Shift+Enter for newline)"
                rows={2}
                className="w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
                autoFocus
              />
              <div className="flex items-center gap-1 px-1 pt-1">
                <IconBtn title="Attach image">
                  <ImageIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Attach file">
                  <Paperclip className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Record screen">
                  <Monitor className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Settings">
                  <Settings className="h-4 w-4" />
                </IconBtn>
                {isBusy ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
              LuaForge can make mistakes. Verify generated scripts before running.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <ForgeLogo className="h-14 w-14 text-primary" />
      <h1 className="mt-3 text-2xl font-semibold">What Luau script are we building?</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ask anything, paste a Roblox game link, drop an image, or record your screen.
      </p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-card/40 px-3 py-3 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <ForgeLogo className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <FormattedText text={text} />
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
        <ForgeLogo className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1.5 pt-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  // Minimal renderer: split on triple-backtick code fences.
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-3">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const inner = part.replace(/^```(\w+)?\n?/, "").replace(/```$/, "");
          const lang = /^```(\w+)/.exec(part)?.[1] ?? "lua";
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-border bg-black/40 p-3 text-[12.5px] leading-relaxed"
            >
              <div className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                {lang}
              </div>
              <code className="font-mono text-foreground/90">{inner}</code>
            </pre>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </div>
  );
}

function IconBtn({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ForgeLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" opacity=".55" />
      <path d="M4 14h6v6H4z" opacity=".55" />
      <path d="M14 14h6v6h-6z" />
      <path d="M10 10l4 4" />
    </svg>
  );
}
