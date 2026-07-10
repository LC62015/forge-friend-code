import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Plus,
  Sparkles,
  ChevronDown,
  Image as ImageIcon,
  Film,
  Monitor,
  Settings,
  Send,
  SlidersHorizontal,
  Square,
  X,
  Loader2,
} from "lucide-react";
import {
  fileToImageAttachment,
  fileToVideoAttachment,
  type Attachment,
} from "@/lib/attachments";

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

  if (!hydrated) return <div className="h-screen bg-background" />;
  return <Chat initial={initialMessages} />;
}

function Chat({ initial }: { initial: UIMessage[] }) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);


  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

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
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [status]);

  const isBusy = status === "submitted" || status === "streaming";

  const submit = (text: string) => {
    const t = text.trim();
    if ((!t && attachments.length === 0) || isBusy) return;

    // Build UIMessage parts: text + one file part per attachment.
    // For videos we send the extracted preview frame as an image, plus a text
    // note describing the source clip so the model has explicit context.
    const parts: UIMessage["parts"] = [];
    for (const a of attachments) {
      if (a.kind === "video") {
        parts.push({
          type: "text",
          text: `[Attached video: ${a.name} — ${a.durationSec}s. Preview frame follows.]`,
        });
        parts.push({
          type: "file",
          mediaType: "image/jpeg",
          url: a.dataUrl,
          filename: `${a.name}.frame.jpg`,
        });
      } else {
        parts.push({
          type: "file",
          mediaType: a.mediaType,
          url: a.dataUrl,
          filename: a.name,
        });
      }
    }
    if (t) parts.push({ type: "text", text: t });

    sendMessage({ role: "user", parts });
    setInput("");
    setAttachments([]);
    setAttachError(null);
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

  const handleFiles = async (
    files: FileList | null,
    kind: "image" | "video",
  ) => {
    if (!files || files.length === 0) return;
    setAttachError(null);
    setProcessing(true);
    try {
      const next: Attachment[] = [];
      for (const f of Array.from(files)) {
        next.push(
          kind === "image"
            ? await fileToImageAttachment(f)
            : await fileToVideoAttachment(f),
        );
      }
      setAttachments((prev) => [...prev, ...next].slice(0, 6));
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Could not attach file");
    } finally {
      setProcessing(false);
    }
  };

  const handleDroppedFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setAttachError(null);
    setProcessing(true);
    try {
      const next: Attachment[] = [];
      for (const f of files) {
        if (f.type.startsWith("image/")) {
          next.push(await fileToImageAttachment(f));
        } else if (f.type.startsWith("video/")) {
          next.push(await fileToVideoAttachment(f));
        } else {
          throw new Error(`${f.name} is not an image or video.`);
        }
      }
      setAttachments((prev) => [...prev, ...next].slice(0, 6));
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : "Could not attach file");
    } finally {
      setProcessing(false);
    }
  };

  const onDragEnter = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onDragOver = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    void handleDroppedFiles(files);
  };

  const onImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files, "image");
    e.target.value = "";


  const removeAttachment = (i: number) =>
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));

  const newChat = () => {
    setMessages([]);
    setInput("");
    setAttachments([]);
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

            {(attachments.length > 0 || attachError) && (
              <div className="mb-2 space-y-2">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((a, i) => (
                      <AttachmentChip
                        key={i}
                        attachment={a}
                        onRemove={() => removeAttachment(i)}
                      />
                    ))}
                  </div>
                )}
                {attachError && (
                  <p className="text-xs text-destructive">{attachError}</p>
                )}
              </div>
            )}

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
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onImagePick}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  className="hidden"
                  onChange={onVideoPick}
                />
                <IconBtn
                  title="Attach image"
                  onClick={() => imageInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </IconBtn>
                <IconBtn
                  title="Attach video"
                  onClick={() => videoInputRef.current?.click()}
                >
                  <Film className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Record screen (coming soon)">
                  <Monitor className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Settings">
                  <Settings className="h-4 w-4" />
                </IconBtn>
                {processing && (
                  <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing…
                  </span>
                )}
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
                    disabled={!input.trim() && attachments.length === 0}
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
      <h1 className="mt-3 text-2xl font-semibold">
        What Luau script are we building?
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ask anything, paste a Roblox game link, or drop in a screenshot or short clip.
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

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-card">
      <img
        src={attachment.dataUrl}
        alt={attachment.name}
        className="h-16 w-24 object-cover"
      />
      {attachment.kind === "video" && (
        <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
          <Film className="h-2.5 w-2.5" />
          {attachment.durationSec}s
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
        title="Remove"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();

  const filePreviews = message.parts.filter(
    (p): p is Extract<UIMessage["parts"][number], { type: "file" }> =>
      p.type === "file",
  );

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-2">
          {filePreviews.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {filePreviews.map((p, i) => (
                <img
                  key={i}
                  src={p.url}
                  alt={p.filename ?? "attachment"}
                  className="max-h-40 rounded-lg border border-border object-cover"
                />
              ))}
            </div>
          )}
          {text && (
            <div className="whitespace-pre-wrap rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              {text}
            </div>
          )}
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
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
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
