import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  Plus,
  Image as ImageIcon,
  Film,
  Monitor,
  Send,
  SlidersHorizontal,
  Square,
  X,
  Loader2,
  Play,
  Search,
  Gamepad2,
  ChevronDown,
} from "lucide-react";
import {
  fileToImageAttachment,
  fileToVideoAttachment,
  type Attachment,
} from "@/lib/attachments";
import { GAMES, findGame, type GameContext, type GameDefinition } from "@/lib/games";
import logoAsset from "@/assets/shadow-scripts-logo.png";

export const Route = createFileRoute("/")({
  component: Gate,
});

const STORAGE_KEY = "shadowscripts.messages.v1";
const VAULT_KEY = "shadowscripts.unlocked.v1";
const VAULT_PASSWORD = "Shadow Scripts";
const GAME_ID_KEY = "shadowscripts.gameId.v1";
const GAME_CTX_PREFIX = "shadowscripts.gameCtx.v1.";
const MAX_INPUT_CHARS = 2_000_000;
const CHUNK_CHARS = 24_000;

function chunkText(text: string, size: number): string[] {
  if (text.length <= size) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + size, text.length);
    if (end < text.length) {
      const slice = text.slice(i, end);
      const nl = slice.lastIndexOf("\n");
      const sp = slice.lastIndexOf(" ");
      const brk = Math.max(nl, sp);
      if (brk > size - 500) end = i + brk + 1;
    }
    chunks.push(text.slice(i, end));
    i = end;
  }
  return chunks;
}

function Gate() {
  const [hydrated, setHydrated] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      if (sessionStorage.getItem(VAULT_KEY) === "1") setUnlocked(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  if (!hydrated) return <div className="h-screen bg-background" />;
  if (unlocked) return <Dashboard />;

  const tryUnlock = () => {
    if (password === VAULT_PASSWORD) {
      try {
        sessionStorage.setItem(VAULT_KEY, "1");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setError("Incorrect password.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0710] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-purple-900/40 bg-[#140a1c]/90 p-8 text-center shadow-[0_0_60px_rgba(147,51,234,0.25)] backdrop-blur">
        <img
          src={logoAsset}
          alt="Shadow Scripts"
          className="mx-auto mb-4 h-24 w-24 object-contain"
          width={96}
          height={96}
        />
        <h1 className="text-2xl font-bold tracking-tight text-purple-300">
          Shadow Scripts
        </h1>
        <p className="mt-1 text-sm text-purple-200/60">Enter the access key.</p>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") tryUnlock();
          }}
          autoFocus
          className="mt-5 w-full rounded-lg border border-purple-900/50 bg-black/40 px-4 py-3 text-sm outline-none placeholder:text-purple-300/30 focus:border-purple-500"
        />
        <button
          onClick={tryUnlock}
          className="mt-3 w-full rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-900/40 transition-opacity hover:opacity-90"
        >
          Unlock
        </button>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function Dashboard() {
  const [hydrated, setHydrated] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCtx, setGameCtx] = useState<GameContext>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setInitialMessages(JSON.parse(raw) as UIMessage[]);
      const gid = localStorage.getItem(GAME_ID_KEY);
      if (gid) {
        setGameId(gid);
        const ctxRaw = localStorage.getItem(GAME_CTX_PREFIX + gid);
        if (ctxRaw) setGameCtx(JSON.parse(ctxRaw));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const selectGame = (id: string | null) => {
    setGameId(id);
    try {
      if (id) {
        localStorage.setItem(GAME_ID_KEY, id);
        const ctxRaw = localStorage.getItem(GAME_CTX_PREFIX + id);
        setGameCtx(ctxRaw ? JSON.parse(ctxRaw) : {});
      } else {
        localStorage.removeItem(GAME_ID_KEY);
        setGameCtx({});
      }
    } catch {
      /* ignore */
    }
  };

  const updateCtx = (id: string, value: string) => {
    setGameCtx((prev) => {
      const next = { ...prev, [id]: value };
      if (gameId) {
        try {
          localStorage.setItem(GAME_CTX_PREFIX + gameId, JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
      return next;
    });
  };

  if (!hydrated) return <div className="h-screen bg-background" />;
  return (
    <Chat
      initial={initialMessages}
      gameId={gameId}
      gameCtx={gameCtx}
      onSelectGame={selectGame}
      onUpdateCtx={updateCtx}
    />
  );
}

function Chat({
  initial,
  gameId,
  gameCtx,
  onSelectGame,
  onUpdateCtx,
}: {
  initial: UIMessage[];
  gameId: string | null;
  gameCtx: GameContext;
  onSelectGame: (id: string | null) => void;
  onUpdateCtx: (id: string, value: string) => void;
}) {
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

  const game = findGame(gameId);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({ gameId, gameContext: gameCtx }),
      }),
    [gameId, gameCtx],
  );

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initial,
    transport,
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
  const charCount = input.length;
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const overLimit = charCount > MAX_INPUT_CHARS;
  const willChunk = charCount > CHUNK_CHARS;
  const chunkCount = willChunk ? Math.ceil(charCount / CHUNK_CHARS) : 1;

  const submit = (text: string) => {
    const t = text.trim();
    if ((!t && attachments.length === 0) || isBusy) return;
    if (t.length > MAX_INPUT_CHARS) return;

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
    if (t) {
      const chunks = chunkText(t, CHUNK_CHARS);
      if (chunks.length === 1) {
        parts.push({ type: "text", text: chunks[0] });
      } else {
        const total = chunks.length;
        chunks.forEach((c, i) => {
          parts.push({
            type: "text",
            text: `[chunk ${i + 1}/${total}]\n${c}`,
          });
        });
      }
    }

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
  };
  const onVideoPick = (e: ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files, "video");
    e.target.value = "";
  };

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

  const placeholder = game
    ? `Ask about ${game.name}… (Enter to send)`
    : "Pick a game in the sidebar, then ask anything…";

  return (
    <div className="flex h-screen bg-[#0b0710] text-white">
      {/* Sidebar */}
      <Sidebar
        gameId={gameId}
        gameCtx={gameCtx}
        onSelectGame={onSelectGame}
        onUpdateCtx={onUpdateCtx}
        onNewChat={newChat}
      />

      {/* Main */}
      <main
        className="relative flex min-w-0 flex-1 flex-col"
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="rounded-2xl border-2 border-dashed border-purple-500 bg-purple-950/40 px-8 py-6 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-purple-300" />
              <p className="mt-2 text-sm font-medium">
                Drop images or videos to attach
              </p>
              <p className="text-xs text-purple-200/60">
                Up to 20 MB each · max 6 files
              </p>
            </div>
          </div>
        )}

        <header className="flex h-12 items-center gap-2 border-b border-purple-900/30 bg-black/30 px-4">
          <img
            src={logoAsset}
            alt="Shadow Scripts"
            className="h-6 w-6 object-contain"
            width={24}
            height={24}
          />
          <span className="font-semibold tracking-tight">Shadow Scripts</span>
          <span className="text-xs text-purple-300/60">
            {game ? `· ${game.name}` : "· pick a game"}
          </span>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              <EmptyState game={game} onPick={submit} />
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

        <div className="border-t border-purple-900/30 bg-black/20 p-4">
          <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-purple-900/40 bg-black/30 px-3 py-2 text-xs text-purple-200/70">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>
                {game
                  ? `Context: ${game.name}${
                      Object.values(gameCtx).some((v) => v?.trim())
                        ? ` (${Object.values(gameCtx).filter((v) => v?.trim()).length} field(s))`
                        : ""
                    }`
                  : "No game selected"}
              </span>
              <span className="ml-auto text-[10px] opacity-60">
                Configure in sidebar
              </span>
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
                  <p className="text-xs text-red-400">{attachError}</p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-purple-900/40 bg-black/40 p-2 shadow-lg shadow-purple-950/30">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={placeholder}
                rows={4}
                maxLength={MAX_INPUT_CHARS}
                className="max-h-[60vh] min-h-[80px] w-full resize-y bg-transparent px-2 py-2 text-sm outline-none placeholder:text-purple-200/30"
                autoFocus
              />
              <div className="flex items-center justify-between px-2 pb-1 text-[11px] text-purple-200/50">
                <span>
                  {wordCount.toLocaleString()} words ·{" "}
                  <span
                    className={overLimit ? "font-medium text-red-400" : ""}
                  >
                    {charCount.toLocaleString()}
                  </span>{" "}
                  / {MAX_INPUT_CHARS.toLocaleString()} chars
                </span>
                <span>
                  {willChunk
                    ? `Sends in ${chunkCount} chunks`
                    : `Chunks at ${CHUNK_CHARS.toLocaleString()} chars`}
                </span>
              </div>
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
                {processing && (
                  <span className="ml-1 inline-flex items-center gap-1 text-[11px] text-purple-200/60">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processing…
                  </span>
                )}
                {isBusy ? (
                  <button
                    type="button"
                    onClick={() => stop()}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" />
                    Stop
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={
                      (!input.trim() && attachments.length === 0) || overLimit
                    }
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-purple-700 to-purple-500 px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-[11px] text-purple-200/40">
              Shadow Scripts can make mistakes. Verify anything before running it in-game.
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  gameId,
  gameCtx,
  onSelectGame,
  onUpdateCtx,
  onNewChat,
}: {
  gameId: string | null;
  gameCtx: GameContext;
  onSelectGame: (id: string | null) => void;
  onUpdateCtx: (id: string, value: string) => void;
  onNewChat: () => void;
}) {
  const [query, setQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const game = findGame(gameId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GAMES;
    return GAMES.filter((g) => g.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <aside className="hidden w-[320px] shrink-0 flex-col border-r border-purple-900/30 bg-[#0a0510] md:flex">
      <div className="flex items-center gap-2 border-b border-purple-900/30 px-4 py-3">
        <img
          src={logoAsset}
          alt=""
          className="h-8 w-8 object-contain"
          width={32}
          height={32}
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">
            Shadow Scripts
          </div>
          <div className="text-[10px] uppercase tracking-widest text-purple-300/50">
            AI Dashboard
          </div>
        </div>
      </div>

      <button
        onClick={onNewChat}
        className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-purple-900/40 bg-black/30 px-3 py-2 text-sm text-purple-100 transition-colors hover:bg-purple-950/40"
      >
        <Plus className="h-4 w-4" />
        New chat
      </button>

      <div className="mt-4 px-3">
        <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-medium uppercase tracking-wider text-purple-300/60">
          <Gamepad2 className="h-3 w-3" />
          Game
        </div>
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-lg border border-purple-900/40 bg-black/40 px-3 py-2 text-sm text-purple-100 transition-colors hover:bg-purple-950/40"
        >
          <span className="truncate">{game ? game.name : "Select a game"}</span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          />
        </button>
        {dropdownOpen && (
          <div className="mt-2 rounded-lg border border-purple-900/40 bg-black/60 p-2">
            <div className="mb-2 flex items-center gap-2 rounded-md border border-purple-900/40 bg-black/40 px-2 py-1.5">
              <Search className="h-3.5 w-3.5 text-purple-300/50" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-purple-200/30"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-2 text-xs text-purple-200/40">No matches</p>
              ) : (
                filtered.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      onSelectGame(g.id);
                      setDropdownOpen(false);
                      setQuery("");
                    }}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                      gameId === g.id
                        ? "bg-purple-900/40 text-white"
                        : "text-purple-100/80 hover:bg-purple-950/40"
                    }`}
                  >
                    <span className="truncate">{g.name}</span>
                    {g.languages[0] && (
                      <span className="ml-2 shrink-0 text-[10px] text-purple-300/50">
                        {g.languages[0]}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {game ? (
          <GamePanel
            game={game}
            context={gameCtx}
            onChange={onUpdateCtx}
          />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-purple-900/40 bg-black/20 p-4 text-xs text-purple-200/50">
            Pick a game above and Shadow Scripts will tailor answers to its
            engine, language, and your play style.
          </div>
        )}
      </div>

      <footer className="border-t border-purple-900/30 px-3 py-3 text-[11px] text-purple-200/40">
        Shadow Scripts · powered by Lovable AI
      </footer>
    </aside>
  );
}

function GamePanel({
  game,
  context,
  onChange,
}: {
  game: GameDefinition;
  context: GameContext;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-purple-900/40 bg-black/30 p-3 text-xs">
        <div className="text-sm font-semibold text-purple-100">{game.name}</div>
        <div className="mt-2 space-y-1 text-purple-200/70">
          {game.engine !== "—" && (
            <MetaRow k="Engine" v={game.engine} />
          )}
          {game.languages.length > 0 && (
            <MetaRow k="Language" v={game.languages.join(", ")} />
          )}
          {game.framework !== "—" && (
            <MetaRow k="Framework" v={game.framework} />
          )}
          {game.fileTypes.length > 0 && (
            <MetaRow k="Files" v={game.fileTypes.join(" ")} mono />
          )}
        </div>
      </div>

      <div className="rounded-lg border border-purple-900/40 bg-black/30 p-3">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-purple-300/60">
          Context
        </div>
        <div className="space-y-2.5">
          {game.fields.map((f) => {
            const value = context[f.id] ?? "";
            const common =
              "w-full rounded-md border border-purple-900/40 bg-black/40 px-2 py-1.5 text-xs outline-none placeholder:text-purple-200/30 focus:border-purple-500";
            return (
              <label key={f.id} className="block">
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-purple-300/50">
                  {f.label}
                </span>
                {f.kind === "textarea" ? (
                  <textarea
                    value={value}
                    onChange={(e) => onChange(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                    className={`${common} resize-y`}
                  />
                ) : f.kind === "select" ? (
                  <select
                    value={value}
                    onChange={(e) => onChange(f.id, e.target.value)}
                    className={common}
                  >
                    <option value="">—</option>
                    {f.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(f.id, e.target.value)}
                    placeholder={f.placeholder}
                    className={common}
                  />
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-16 shrink-0 text-[10px] uppercase tracking-wider text-purple-300/50">
        {k}
      </span>
      <span
        className={`min-w-0 flex-1 break-words ${mono ? "font-mono text-[10.5px]" : ""}`}
      >
        {v}
      </span>
    </div>
  );
}

function EmptyState({
  game,
  onPick,
}: {
  game: GameDefinition | undefined;
  onPick: (t: string) => void;
}) {
  const suggestions = game
    ? suggestionsForGame(game)
    : [
        "What game do you want help with?",
        "Recommend me a game to play tonight",
        "Explain the differences between Source 2 and Unreal 5",
        "What's the best language for game scripting in 2026?",
      ];

  return (
    <div className="flex flex-col items-center py-16 text-center">
      <img
        src={logoAsset}
        alt="Shadow Scripts"
        className="h-24 w-24 object-contain drop-shadow-[0_0_30px_rgba(147,51,234,0.4)]"
        width={96}
        height={96}
      />
      <h1 className="mt-4 text-2xl font-bold tracking-tight">
        {game ? `Shadow Scripts · ${game.name}` : "Shadow Scripts"}
      </h1>
      <p className="mt-2 max-w-md text-sm text-purple-200/60">
        {game
          ? `Ask anything about ${game.name} — tactics, builds, mechanics, or scripting${game.languages.length ? ` in ${game.languages[0]}` : ""}.`
          : "Your AI companion across dozens of games. Pick one in the sidebar to sharpen the answers."}
      </p>
      <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-purple-900/40 bg-black/30 px-3 py-3 text-left text-sm text-purple-100/90 transition-colors hover:border-purple-700/60 hover:bg-purple-950/40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function suggestionsForGame(g: GameDefinition): string[] {
  switch (g.id) {
    case "cs2":
      return [
        "Best smoke lineups for A site on Mirage as T",
        "How do I improve my crosshair placement?",
        "Explain the CT default on Inferno",
        "Give me a warmup routine to hit Premier 15k",
      ];
    case "roblox":
      return [
        "Write a leaderstats module with DataStore saving",
        "Build a sword combat system",
        "Explain FilteringEnabled and RemoteEvents",
        "Make a round-based lobby teleport script",
      ];
    case "fivem":
      return [
        "QBCore resource that adds a fishing job",
        "How do I use fxmanifest.lua correctly?",
        "NUI callback example with client/server flow",
        "Explain event security in FiveM",
      ];
    case "minecraft":
      return [
        "Fabric mod that adds a new sword",
        "Datapack recipe for a custom crafting result",
        "Bedrock Add-on that spawns a custom entity",
        "Optimize a redstone farm",
      ];
    default:
      return [
        `What are the fundamentals of ${g.name}?`,
        `Give me a training plan for ${g.name}`,
        `What are common mistakes in ${g.name}?`,
        `Suggest 5 things to try next in ${g.name}`,
      ];
  }
}

function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-purple-900/40 bg-black/40">
      <img
        src={attachment.dataUrl}
        alt={attachment.name}
        className="h-16 w-24 object-cover"
      />
      {attachment.kind === "video" && (
        <div className="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
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
                  className="max-h-40 rounded-lg border border-purple-900/40 object-cover"
                />
              ))}
            </div>
          )}
          {text && (
            <div className="whitespace-pre-wrap rounded-2xl bg-gradient-to-br from-purple-700 to-purple-500 px-4 py-2.5 text-sm text-white">
              {text}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <img
        src={logoAsset}
        alt=""
        className="mt-0.5 h-7 w-7 shrink-0 object-contain"
        width={28}
        height={28}
      />
      <div className="min-w-0 flex-1 text-sm leading-relaxed">
        <FormattedText text={text} />
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <img
        src={logoAsset}
        alt=""
        className="mt-0.5 h-7 w-7 shrink-0 object-contain opacity-70"
        width={28}
        height={28}
      />
      <div className="flex items-center gap-1.5 pt-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-purple-400 [animation-delay:300ms]" />
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
          const lang = /^```(\w+)/.exec(part)?.[1] ?? "text";
          const isLua = /^(lua|luau)$/i.test(lang);
          return <CodeBlock key={i} code={inner} lang={lang} runnable={isLua} />;
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

function CodeBlock({
  code,
  lang,
  runnable,
}: {
  code: string;
  lang: string;
  runnable: boolean;
}) {
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [ok, setOk] = useState(true);

  const run = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const fengari = await import("fengari-web");
      const { lua, lauxlib, lualib, to_luastring, to_jsstring } = fengari as any;
      const L = lauxlib.luaL_newstate();
      lualib.luaL_openlibs(L);

      const buf: string[] = [];
      lua.lua_pushcfunction(L, (LL: any) => {
        const n = lua.lua_gettop(LL);
        const line: string[] = [];
        for (let i = 1; i <= n; i++) {
          const s = lauxlib.luaL_tolstring(LL, i);
          line.push(to_jsstring(s));
          lua.lua_pop(LL, 1);
        }
        buf.push(line.join("\t"));
        return 0;
      });
      lua.lua_setglobal(L, to_luastring("print"));

      const stub = `
        wait = wait or function(t) return t or 0 end
        task = task or { wait = function(t) return t or 0 end, spawn = function(f, ...) return f(...) end, delay = function(_, f, ...) return f(...) end }
        Instance = Instance or { new = function(cls) return { ClassName = cls, Name = cls } end }
      `;
      lauxlib.luaL_dostring(L, to_luastring(stub));

      const status = lauxlib.luaL_dostring(L, to_luastring(code));
      if (status !== 0) {
        const err = to_jsstring(lua.lua_tostring(L, -1));
        setOk(false);
        setOutput(err || "Lua error");
      } else {
        setOk(true);
        setOutput(buf.length ? buf.join("\n") : "(no output)");
      }
    } catch (e) {
      setOk(false);
      setOutput(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-purple-900/40 bg-black/60">
      <div className="flex items-center justify-between border-b border-purple-900/40 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-purple-300/60">
          {lang}
        </span>
        {runnable && (
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="inline-flex items-center gap-1 rounded-md bg-purple-600 px-2 py-0.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {running ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            {running ? "Running…" : "Test"}
          </button>
        )}
      </div>
      <pre className="overflow-x-auto p-3 text-[12.5px] leading-relaxed">
        <code className="font-mono text-purple-50/90">{code}</code>
      </pre>
      {output !== null && (
        <div
          className={`border-t border-purple-900/40 px-3 py-2 text-[12px] ${
            ok ? "text-emerald-300" : "text-red-300"
          }`}
        >
          <div className="mb-1 text-[10px] uppercase tracking-wider text-purple-300/60">
            {ok ? "Output" : "Error"}
          </div>
          <pre className="whitespace-pre-wrap font-mono">{output}</pre>
        </div>
      )}
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-purple-200/70 transition-colors hover:bg-purple-950/40 hover:text-white"
    >
      {children}
    </button>
  );
}
