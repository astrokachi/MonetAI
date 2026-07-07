# MonetAI

Analyse bank statements with AI. Choose between a local in-browser LLM (private, offline) or a cloud API (more capable models).

## Design Goals

**Privacy first.** Financial data is sensitive. The local mode runs entirely in the browser via WebLLM — no upload, no server, no third party ever sees the statement text. Cloud mode is opt-in and clearly gated behind an explicit engine selector on first load.

**Streaming as the default.** Analysis output streams token-by-token so you see results as they're generated rather than waiting for a full response. Both local and cloud modes share the same streaming interface.

**Structured, not freeform.** The analysis prompt forces a fixed `##` heading structure (Financial Summary, Spending Analysis, Transaction Insights, Financial Health Assessment, Recommendations) so output is consistent and machine-parseable regardless of which model generated it.

## Architecture

**Engine selection** (`ModelContext` at `app/context/model_context.tsx`):
- `mode` is `null` by default → shows the engine selector
- `mode: "local"` → user picks a model → WebLLM downloads it → inference happens client-side via `WebLLMEngine`
- `mode: "cloud"` → skips model download entirely → text is sent to `/api/chat` for streaming analysis via an OpenAI-compatible provider

**Text extraction** (`/api/upload`):
- PDF is parsed server-side with `pdfjs-dist`
- Supports password-protected PDFs via `x-pdf-password` header
- Returns raw text, which is cleaned and formatted client-side before being fed to either engine

**Cloud AI service** (`app/services/cloud_ai.ts`):
- Thin wrapper around the `ai` SDK's `streamText` with a system prompt
- No session state, no embeddings, no RAG — just a single prompt call
- The system prompt enforces the `##` section structure so the frontend can split on it reliably

**Analysis view** (`app/components/inference.tsx`):
- Splits the response on `## ` to create headed sections
- A `renderBody()` function parses each section body: detects `- ` / `* ` lines as `<ul>`, `1. ` lines as `<ol>`, and inline `**bold**` as `<strong>`
- Bare `#` lines from the model are stripped — they were used as visual separators

## State Flow

```
Engine Selector ──► mode="local"  ──► ModelSelector ──► WebLLM download ──► Upload ──► analyze ──► display
                │
                └──► mode="cloud" ──► Upload ──► /api/chat stream ──► display
```

Each document upload resets state completely. There is no conversation memory — the model analyses each statement independently.

## Running Locally

```bash
npm install
cp .env.example .env   # only needed for cloud mode
npm run dev            # → http://localhost:3000
```

### Environment Variables (cloud mode only)

| Variable | Purpose |
|---|---|
| `CLOUD_API_KEY` | API key (OpenAI, etc.) |
| `CLOUD_BASE_URL` | Endpoint URL (defaults to GitHub Models) |
| `CLOUD_MODEL` | Model name (default: `gpt-4o-mini`) |
| `GITHUB_TOKEN` | Alternative to `CLOUD_API_KEY` for GitHub Models |

Without these, the app still works — only local browser models will be available.

## Key Trade-offs

- **Webpack, not Turbopack.** `next build --webpack` is explicit in the scripts. Turbopack had intermittent issues with some of the native dependencies.
- **Server-side text extraction.** PDF parsing needs native bindings (`pdfjs-dist`). Running it on the server keeps the client bundle small and avoids shipping a multi-MB parser to the browser.

## Project Layout

```
app/
├── api/
│   ├── chat/route.ts       — Cloud analysis streaming proxy
│   └── upload/route.ts     — PDF extraction
├── components/
│   ├── document_processor.tsx  — State machine orchestrating the pipeline
│   ├── inference.tsx           — Analysis display with markdown→HTML conversion
│   ├── model_selector.tsx      — Local model download progress
│   └── upload.tsx              — Drag-and-drop file upload
├── context/
│   └── model_context.tsx       — React context for mode/model/engine state
├── engines/
│   ├── web_llm.ts             — WebLLM wrapper
│   └── wllama.ts              — Wllama wrapper
├── services/
│   └── cloud_ai.ts            — Cloud analysis client via AI SDK
└── utils/
    ├── text_extraction.ts     — PDF → text (pdfjs-dist)
    └── text_formatting.ts     — Whitespace normalisation, date parsing
```

## Tech Stack

- Next.js 16 (App Router, Webpack)
- React 19, Tailwind CSS 4
- AI SDK (`ai`, `@ai-sdk/openai-compatible`) — cloud analysis
- WebLLM & Wllama (local inference)
- pdfjs-dist (PDF parsing)
- @phosphor-icons/react
