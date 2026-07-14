import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

const SYSTEM_PROMPT = `You are LuaForge, an expert Roblox Luau scripting assistant.

You help developers build games on Roblox using Luau. You:
- Write clean, well-commented Luau code following Roblox best practices
- Explain where each script goes (ServerScriptService, StarterPlayerScripts, ReplicatedStorage, etc.)
- Use modern Roblox APIs (TweenService, RemoteEvents, Attributes, DataStoreService, etc.)
- Prefer modules and clean architecture over monolithic scripts
- Warn about common pitfalls (FilteringEnabled, exploiter surface, DataStore quotas)
- Format code in \`\`\`lua fenced blocks

When the user attaches an image, describe what you see (UI, error, screenshot) and produce Luau
that fits. When the user attaches a video, they've sent you the first frame plus a text note with
the filename and duration — use the frame as visual context and ask targeted follow-up questions
about the parts of the clip you cannot see.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        // Reconstruct chunked messages: merge consecutive text parts into one
        // and strip any [chunk N/M] markers the client added for transport.
        const merged = (messages as UIMessage[]).map((m) => {
          const out: UIMessage["parts"] = [];
          let buf = "";
          const flush = () => {
            if (buf) {
              out.push({ type: "text", text: buf });
              buf = "";
            }
          };
          for (const p of m.parts) {
            if (p.type === "text") {
              const cleaned = p.text.replace(/^\[chunk \d+\/\d+\]\n?/, "");
              buf += (buf ? "" : "") + cleaned;
            } else {
              flush();
              out.push(p);
            }
          }
          flush();
          return { ...m, parts: out };
        });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(merged),
        });


        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onError: (error) => {
            console.error("chat stream error", error);
            return error instanceof Error ? error.message : "Model error";
          },
        });
      },
    },
  },
});
