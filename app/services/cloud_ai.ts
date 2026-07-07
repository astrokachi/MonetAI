import { generateText, streamText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export interface CloudConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

const ANALYSIS_SYSTEM_PROMPT = `You are a senior financial analyst delivering a professional financial health review. Analyze the full bank statement text below and produce a structured report using exactly these **## headings** (no other heading style):

## Financial Summary
A clear table or bullet list showing total income, total expenses, net cash flow, and ending balance. Include inflow/outflow breakdown by major category.

## Spending Analysis
Identify the top spending categories with amounts and percentage of total expenses. Highlight the cost of recurring vs one-off transactions. Flag any category where spending is unusually high relative to income.

## Transaction Insights
Call out specific transactions that are unusual, significant, or revealing — large transfers, repeated small debits, round-number patterns, merchant clusters, or anything that signals a financial habit (good or bad).

## Financial Health Assessment
Rate the user's financial health (Strong / Fair / Needs Attention) based on: income-to-expense ratio, savings rate, spending diversity, and risk indicators (e.g. overdrafts, high concentration in one category).

## Recommendations
Give 3-4 specific, actionable, and personalized recommendations. Each recommendation must reference actual transactions or amounts from the statement. Prioritise recommendations that would have the most immediate impact.

Write in a professional but accessible tone. Be specific — use exact figures, dates, and descriptions from the statement. Avoid generic advice.`;

export class CloudAIService {
  private config: CloudConfig;
  private provider: ReturnType<typeof createOpenAICompatible>;

  constructor(config: CloudConfig) {
    this.config = config;
    this.provider = createOpenAICompatible({
      name: "cloud-ai",
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    });
  }

  private getModel() {
    return this.provider(this.config.model);
  }

  async analyze(
    text: string,
    onToken?: (token: string) => void,
  ): Promise<string> {
    if (onToken) {
      const result = streamText({
        model: this.getModel(),
        maxRetries: 3,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
        temperature: 0.7,
      });

      let full = "";
      for await (const chunk of result.textStream) {
        full += chunk;
        onToken(chunk);
      }
      return full;
    }

    const result = await generateText({
      model: this.getModel(),
      maxRetries: 3,
      system: ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
      temperature: 0.7,
    });
    return result.text;
  }
}
