import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { findGame, buildGameContextBlock, type GameContext } from "@/lib/games";

const BASE_SYSTEM_PROMPT = `You are Shadow Scripts, a versatile AI assistant that helps players, modders, and developers with the game they are working on right now.

You:
- Give tactical, mechanical, and progression advice for the selected game
- When the game supports modding/scripting, write clean, well-commented code in that game's language and stack
- Cite the correct engine APIs, file layout, and load points
- Format code in triple-backtick fenced blocks using the correct language tag
- Warn about common pitfalls (exploiter surface, TOS-safe scope, performance)
- Refuse to build cheats, injectors, aimbots, ESP/wallhacks, or anything designed to bypass anti-cheat or grant unfair multiplayer advantages

When the user attaches an image, describe what you see (UI, error, screenshot, map) and answer based on it.
When the user attaches a video, they have sent the first frame plus a text note with the filename and duration — use the frame as visual context and ask targeted follow-up questions about the parts you cannot see.`;

type ChatRequestBody = {
  messages?: unknown;
  gameId?: string;
  gameContext?: GameContext;
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const { messages, gameId, gameContext } = body;
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
              buf += cleaned;
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

        const game = findGame(gameId);
        const system = game
          ? `${BASE_SYSTEM_PROMPT}\n\n=== ACTIVE GAME CONTEXT ===\n${buildGameContextBlock(game, gameContext ?? {})}`
          : `${BASE_SYSTEM_PROMPT}\n\nNo game is currently selected. Ask the user which game they need help with before writing code specific to an engine.`;

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system,
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
