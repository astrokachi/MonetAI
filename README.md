# MonetAI

Upload bank statement PDFs and get AI-powered financial analysis. Supports local models (WebLLM in-browser, fully offline) and cloud AI providers.

## How it works

1. Upload a PDF bank statement
2. The parser extracts transactions into structured data
3. AI analyzes spending patterns and generates insights
4. Ask follow-up questions about your finances

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Cloud AI (optional)

Set these environment variables to use a cloud AI provider:

```bash
CLOUD_API_KEY=your_api_key
CLOUD_BASE_URL=https://models.inference.ai.azure.com  # default
CLOUD_MODEL=gpt-4o-mini                                 # default
```

Without a cloud provider configured, the app runs entirely in-browser using WebLLM.
