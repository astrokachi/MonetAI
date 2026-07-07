import { CloudAIService } from "@/app/services/cloud_ai";

const DEFAULT_API_KEY = process.env.CLOUD_API_KEY || process.env.GITHUB_TOKEN || "";
const DEFAULT_MODEL = process.env.CLOUD_MODEL || "gpt-4o-mini";

let service: CloudAIService | null = null;

function getService(): CloudAIService {
  if (!service) {
    service = new CloudAIService({
      apiKey: DEFAULT_API_KEY,
      baseURL: process.env.CLOUD_BASE_URL || "https://models.inference.ai.azure.com",
      model: DEFAULT_MODEL,
    });
  }
  return service;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { text } = body;

    if (!text) {
      return Response.json({ error: "text is required" }, { status: 400 });
    }

    const svc = getService();
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await svc.analyze(text, (token) => {
            controller.enqueue(encoder.encode(JSON.stringify({ token }) + "\n"));
          });
          controller.enqueue(encoder.encode(JSON.stringify({ done: true, full: result }) + "\n"));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Analysis failed";
          controller.enqueue(encoder.encode(JSON.stringify({ error: message }) + "\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
