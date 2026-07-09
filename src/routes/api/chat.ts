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

When the user pastes a game link, image, or describes a system, produce runnable Luau code and setup instructions.`;

type ChatRequestBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
