export interface ModelType {
  name: string;
  url: string;
}

export type EngineType = "webllm" | "wllama" | "cloud";
export type AppMode = "local" | "cloud" | null;

export type AppPhase = "select" | "downloading" | "ready";

// --- Statement Parser Types ---

export type TransactionDirection = "in" | "out";

export interface ParsedTransaction {
  date: string;
  time?: string;
  direction: TransactionDirection;
  amount: number;
  balanceAfter?: number;
  category: string;
  counterparty?: string;
  description: string;
  confidence: number;
  flags: string[];
  raw: string;
}

export interface StatementMetadata {
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  periodStart?: string;
  periodEnd?: string;
  openingBalance?: number;
  closingBalance?: number;
}

export interface ParseResult extends StatementMetadata {
  transactions: ParsedTransaction[];
  warnings: string[];
}

export interface RawSegment {
  raw: string;
  dateStr: string;
  timeStr?: string;
  startIndex: number;
}

export interface MoneyToken {
  value: number;
  raw: string;
  index: number;
}
