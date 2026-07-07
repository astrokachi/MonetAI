import type {
  ParsedTransaction,
  ParseResult,
  RawSegment,
  MoneyToken,
  TransactionDirection,
} from "./types";

interface CategoryRule {
  pattern: RegExp;
  category: string;
}

// ─── Money / Amount ───────────────────────────────────────────────────────────

const MONEY_TOKEN_RE =
  /(?<![\d.,])(₦|NGN\s?|N(?=\d))?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)(?!\d)/g;

function looksLikeMoney(_raw: string, hasCurrencyMarker: boolean): boolean {
  if (hasCurrencyMarker) return true;
  return /[,.]/.test(_raw);
}

export function parseMoney(raw: string): number | null {
  const cleaned = raw
    .replace(/[₦N\s]/g, "")
    .replace(/NGN/g, "")
    .replace(/,/g, "")
    .trim();
  if (!cleaned || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function findMoneyTokens(text: string): MoneyToken[] {
  const tokens: MoneyToken[] = [];
  const re = new RegExp(MONEY_TOKEN_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const currencyMarker = match[1] || "";
    const numberPart = match[2] || "";
    if (!looksLikeMoney(numberPart, !!currencyMarker)) continue;
    const value = parseMoney(numberPart);
    if (value !== null) {
      tokens.push({ value, raw: match[0], index: match.index });
    }
  }
  return tokens;
}

// ─── Date / Time ──────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export const ANCHOR_REGEX = new RegExp(
  [
    "(?<iso>\\d{4}-\\d{2}-\\d{2})",
    "|(?<num>\\d{1,2}[\\/\\-]\\d{1,2}[\\/\\-]\\d{2,4})",
    "|(?<textDate>\\d{1,2}\\s+[A-Za-z]{3,9}\\.?,?\\s+\\d{2,4}|[A-Za-z]{3,9}\\.?\\s+\\d{1,2},?\\s+\\d{2,4})",
  ].join(""),
  "g",
);

export const TIME_REGEX = /\d{1,2}:\d{2}(?::\d{2})?\s?(?:AM|PM|am|pm)?/;

export function findAdjoiningTime(text: string, afterIndex: number): string | undefined {
  const window = text.slice(afterIndex, afterIndex + 20);
  const m = window.match(TIME_REGEX);
  if (!m) return undefined;
  if (m.index !== undefined && m.index <= 4) return m[0];
  return undefined;
}

function twoDigitYearToFour(yy: number): number {
  return yy < 100 ? (yy >= 70 ? 1900 + yy : 2000 + yy) : yy;
}

function isoFromParts(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function normalizeDate(raw: string): string | null {
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return raw;

  const numMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const month = parseInt(numMatch[2], 10);
    let year = parseInt(numMatch[3], 10);
    year = twoDigitYearToFour(year);
    if (month > 12 && day <= 12) return isoFromParts(year, day, month);
    return isoFromParts(year, month, day);
  }

  const textMatch1 = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{2,4})$/);
  if (textMatch1) {
    const day = parseInt(textMatch1[1], 10);
    const month = MONTHS[textMatch1[2].slice(0, 3).toLowerCase()];
    let year = parseInt(textMatch1[3], 10);
    year = twoDigitYearToFour(year);
    if (month) return isoFromParts(year, month, day);
  }

  const textMatch2 = raw.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (textMatch2) {
    const month = MONTHS[textMatch2[1].slice(0, 3).toLowerCase()];
    const day = parseInt(textMatch2[2], 10);
    let year = parseInt(textMatch2[3], 10);
    year = twoDigitYearToFour(year);
    if (month) return isoFromParts(year, month, day);
  }

  return null;
}

export function normalizeTime(raw?: string): string | undefined {
  if (!raw) return undefined;
  const m = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM|am|pm)?/);
  if (!m) return undefined;
  let hour = parseInt(m[1], 10);
  const minute = m[2];
  const second = m[3] ?? "00";
  const meridiem = m[4]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, "0")}:${minute}:${second}`;
}

// ─── boilerplate ──────────────────────────────────────────────────────────

const GENERIC_BOILERPLATE: RegExp[] = [
  /page\s*\d+\s*(of|of)\s*\d+/gi,
  /disclaimer[^]*?(?=\n\s*\n|$)/gi,
  /terms?\s+and?\s+conditions?[^]*?(?=\n\s*\n|$)/gi,
  /---+\s+\d+\s+of\s+\d+\s+---+?/g,
  /confidential(ity)?[^]*?(?=\n\s*\n|$)/gi,
  /this\s+(is\s+)?an?\s+electronic[^]*?(?=\n\s*\n|$)/gi,
  /ndic[^]*?disclaimer[^]*?(?=\n\s*\n|$)/gi,
  /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+page\s*\d+/gi,
  /money\s+(?:in|out)[^]*?(?=\n)/gi,
];

export function stripBoilerplate(text: string): string {
  for (const re of GENERIC_BOILERPLATE) {
    text = text.replace(re, "");
  }
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n");
}

// ─── Category Rules ───────────────────────────────────────────────────────────

export const GENERIC_CATEGORIES: CategoryRule[] = [
  { pattern: /airtime|recharge|vtub?/i, category: "airtime" },
  { pattern: /electricity|prepaid\s+meter|eko\s+electric/i, category: "utilities" },
  { pattern: /data\s+(subscription|bundle)/i, category: "data" },
  { pattern: /cable\s+tv|gotv|dstv|startimes/i, category: "entertainment" },
  { pattern: /internet|wifi|isp/i, category: "utilities" },
  { pattern: /pos\s*(withdrawal|purchase|debit)/i, category: "pos_withdrawal" },
  { pattern: /atm\s*(withdrawal)?/i, category: "atm_withdrawal" },
  { pattern: /transfer\s+(to|out)/i, category: "outward_transfer" },
  { pattern: /transfer\s+(from|in)|inward/i, category: "inward_transfer" },
  { pattern: /salary|wage|payroll/i, category: "salary" },
  { pattern: /interest\s+(paid|earned)/i, category: "interest" },
  { pattern: /stamp\s+duty|cot\s+charge|vat\s+on\s+/i, category: "bank_charge" },
  { pattern: /sms\s+charge|maintenance\s+fee|monthly\s+fee/i, category: "bank_charge" },
  { pattern: /refund|reversal|chargeback/i, category: "reversal" },
  { pattern: /loan\s+(disbursement|repayment)/i, category: "loan" },
  { pattern: /savings?\s+(withdrawal|deposit)/i, category: "savings" },
  { pattern: /bill\s+payment|payment\s+to\s+biller/i, category: "bill_payment" },
  { pattern: /insurance/i, category: "insurance" },
  { pattern: /remitta|tax/i, category: "government_payment" },
  { pattern: /flutterwave|paystack|monify|interswitch/i, category: "payment_gateway" },
  { pattern: /investment|mutual\s+fund|treasury\s+bill/i, category: "investment" },
  { pattern: /withdrawal/i, category: "withdrawal" },
  { pattern: /deposit|cash\s+in/i, category: "deposit" },
  { pattern: /cbn\/opay|stamp\s+duty/i, category: "bank_charge" },
];

function classify(text: string): string {
  for (const r of GENERIC_CATEGORIES) {
    if (r.pattern.test(text)) return r.category;
  }
  return "uncategorized";
}

// ─── Direction Keywords ──────────────────────────────────────────────────────

function inferDirectionFromKeywords(text: string): TransactionDirection | null {
  const lower = text.toLowerCase();
  const inWords = /credit|money\s+in|inward|deposit|salary|interest|refund|reversal|transfer\s+from|cash\s+in|Cr\b/i;
  const outWords = /debit|money\s+out|outward|withdrawal|charge|fee|transfer\s+to|purchase|payment|pos\b|atm\b|stamp\s+duty|cot\s+charge|Dr\b/i;
  if (inWords.test(lower) && !outWords.test(lower)) return "in";
  if (outWords.test(lower) && !inWords.test(lower)) return "out";
  return null;
}

// ─── Segmenting ───────────────────────────────────────────────────────────────

export function segmentTransactions(text: string): RawSegment[] {
  const segments: RawSegment[] = [];
  const anchors: { index: number; dateStr: string }[] = [];

  let match: RegExpExecArray | null;
  const re = new RegExp(ANCHOR_REGEX);
  while ((match = re.exec(text)) !== null) {
    const dateStr = match[1] || match[2] || match[3] || "";
    if (dateStr) {
      anchors.push({ index: match.index, dateStr });
    }
  }

  if (anchors.length === 0) return segments;

  for (let i = 0; i < anchors.length; i++) {
    const start = anchors[i].index;
    const end = i + 1 < anchors.length ? anchors[i + 1].index : text.length;
    const block = text.slice(start, end).trim();

    if (!block) continue;

    const timeStr = findAdjoiningTime(text, start);
    segments.push({
      raw: block,
      dateStr: anchors[i].dateStr,
      timeStr,
      startIndex: start,
    });
  }

  return segments;
}

// ─── Single Segment Parser ───────────────────────────────────────────────────

function parseSegment(
  seg: RawSegment,
  prevBalance?: number,
): ParsedTransaction {
  const flags: string[] = [];
  const moneyTokens = findMoneyTokens(seg.raw);

  const amount: number | null =
    moneyTokens.length > 0 ? moneyTokens[0].value : null;

  const balanceAfter: number | null =
    moneyTokens.length >= 2
      ? moneyTokens[moneyTokens.length - 1].value
      : null;

  const rest = seg.raw
    .replace(seg.dateStr, "")
    .replace(seg.timeStr ?? "", "")
    .trim();

  const kwDirection = inferDirectionFromKeywords(rest);

  let direction: TransactionDirection;
  let resolvedAmount: number;
  let confidence = 1;

  if (amount === null) {
    direction = "out";
    resolvedAmount = 0;
    confidence = 0.3;
    flags.push("no_amount_found");
  } else if (kwDirection) {
    direction = kwDirection;
    resolvedAmount = amount;
  } else if (prevBalance !== undefined && balanceAfter !== null) {
    const amountApprox = amount;
    const margin = 0.02 * Math.max(amountApprox, 0.01);

    if (Math.abs(prevBalance + amountApprox - balanceAfter) <= margin) {
      direction = "in";
      resolvedAmount = amountApprox;
    } else if (Math.abs(prevBalance - amountApprox - balanceAfter) <= margin) {
      direction = "out";
      resolvedAmount = amountApprox;
    } else {
      direction = inferDirectionFromKeywords(seg.raw) ?? "out";
      resolvedAmount = amountApprox;
      confidence = 0.6;
      flags.push("balance_mismatch");
    }
  } else {
    direction = "out";
    resolvedAmount = amount;
    confidence = 0.5;
    flags.push("no_anchor_balance");
  }

  if (moneyTokens.length === 0) flags.push("no_amount_found");
  if (balanceAfter === null) flags.push("no_balance_found");
  if (moneyTokens.length < 2) flags.push("single_money_token");

  const category = classify(rest);

  const counterparty = extractCounterparty(rest, category);

  const description = rest
    .replace(/₦[\d,]+\.?\d*/g, "")
    .replace(/NGN\s?[\d,]+\.?\d*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  return {
    date: normalizeDate(seg.dateStr) ?? seg.dateStr,
    time: normalizeTime(seg.timeStr),
    direction,
    amount: resolvedAmount,
    balanceAfter: balanceAfter ?? undefined,
    category,
    counterparty,
    description,
    confidence,
    flags,
    raw: seg.raw,
  };
}

function extractCounterparty(text: string, _category: string): string | undefined {
  void _category;
  const knownPrefixes = [
    /(?:to|from|transfer\s+(?:to|from))\s+(.+?)(?:\s*[-\–]\s*|\s*\d{10,}|\s*$)/i,
    /(?:paid\s+(?:to|by))\s+(.+?)(?:\s*[-\–]\s*|\s*\d{10,}|\s*$)/i,
    /(?:via|at)\s+(.+?)(?:\s*[-\–]\s*|\s*\d{10,}|\s*$)/i,
  ];
  for (const re of knownPrefixes) {
    const m = text.match(re);
    if (m) return m[1].trim().slice(0, 80);
  }
  return undefined;
}

// ─── Metadata Extraction ─────────────────────────────────────────────────────

function extractAccountNumber(text: string): string | undefined {
  const m = text.match(/\b(\d{10})\b/);
  return m?.[1];
}

function extractBankName(text: string): string | undefined {
  const banks = [
    /kuda\s*(?:mf)?\s*bank/i,
    /gtbank|guaranty\s+trust\s+bank/i,
    /access\s+bank/i,
    /first\s+bank/i,
    /zenith\s+bank/i,
    /uba|united\s+bank\s+for\s+africa/i,
    /opay|opal\s+pay/i,
    /palm(pay)?/i,
    /moniepoint/i,
    /sterling\s+bank/i,
    /fcmb/i,
    /union\s+bank/i,
    /ecobank/i,
    /fidelity\s+bank/i,
    /stanbic/i,
    /polaris/i,
    /wema/i,
    /providus/i,
    /taj\s+bank/i,
    /globus/i,
    /suntrust/i,
    /coronation/i,
  ];
  for (const re of banks) {
    const m = text.match(re);
    if (m) {
      const name = m[0].trim();
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
  }
  return undefined;
}

function extractPeriod(raw: string): {
  periodStart?: string;
  periodEnd?: string;
} {
  const m = raw.match(
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*[–\-to]+\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  );
  if (m) {
    const start = normalizeDate(m[1]);
    const end = normalizeDate(m[2]);
    return { periodStart: start ?? undefined, periodEnd: end ?? undefined };
  }
  return {};
}

function extractBalances(
  text: string,
  transactions: ParsedTransaction[],
): { openingBalance?: number; closingBalance?: number } {
  const firstTx = transactions[0];
  const lastTx = transactions[transactions.length - 1];

  const result: { openingBalance?: number; closingBalance?: number } = {};

  if (lastTx?.balanceAfter !== undefined) {
    result.closingBalance = lastTx.balanceAfter;
  }

  const openingMatch = text.match(
    /(?:opening|brought\s+forward|balance\s+b[fd])\s*:?\s*₦?\s*([\d,]+\.?\d*)/i,
  );
  if (openingMatch) {
    result.openingBalance = parseMoney(openingMatch[1]) ?? undefined;
  } else if (firstTx?.balanceAfter !== undefined && firstTx.amount > 0) {
    if (firstTx.direction === "in") {
      result.openingBalance = parseFloat(
        (firstTx.balanceAfter - firstTx.amount).toFixed(2),
      );
    } else {
      result.openingBalance = parseFloat(
        (firstTx.balanceAfter + firstTx.amount).toFixed(2),
      );
    }
  }

  return result;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function parseStatement(rawText: string): ParseResult {
  const warnings: string[] = [];

  if (!rawText || rawText.trim().length === 0) {
    return {
      transactions: [],
      warnings: ["Empty input"],
    };
  }

  const cleaned = stripBoilerplate(rawText);

  const headerText = rawText.slice(0, Math.min(2000, rawText.length));
  const accountNumber = extractAccountNumber(headerText);
  const bankName = extractBankName(headerText);
  const period = extractPeriod(headerText);

  const rawSegments = segmentTransactions(cleaned);

  if (rawSegments.length === 0) {
    return {
      transactions: [],
      accountNumber,
      bankName,
      ...period,
      warnings: ["No date-anchored transaction blocks found"],
    };
  }

  const transactions: ParsedTransaction[] = [];
  let prevBalance: number | undefined;

  for (const seg of rawSegments) {
    const tx = parseSegment(seg, prevBalance);
    transactions.push(tx);
    if (tx.balanceAfter !== undefined) {
      prevBalance = tx.balanceAfter;
    }
  }

  const balances = extractBalances(rawText, transactions);

  return {
    transactions,
    accountNumber,
    bankName,
    ...period,
    ...balances,
    warnings,
  };
}

function fmt(n: number | undefined): string {
  if (n === undefined) return "—";
  return `NGN${n.toFixed(2)}`;
}

export function formatForLLM(result: ParseResult): string {
  const lines: string[] = [];
  const meta = [];

  if (result.accountNumber) meta.push(`Account ${result.accountNumber}`);
  if (result.periodStart && result.periodEnd)
    meta.push(`Period ${result.periodStart} – ${result.periodEnd}`);
  if (result.openingBalance !== undefined)
    meta.push(`Opening ${fmt(result.openingBalance)}`);
  if (result.closingBalance !== undefined)
    meta.push(`Closing ${fmt(result.closingBalance)}`);

  if (meta.length > 0) lines.push(meta.join(" | "));
  lines.push("");

  const totalIn = result.transactions
    .filter((t) => t.direction === "in")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = result.transactions
    .filter((t) => t.direction === "out")
    .reduce((s, t) => s + t.amount, 0);

  lines.push(
    `Summary: Total in ${fmt(totalIn)} | Total out ${fmt(totalOut)} | ${result.transactions.length} transactions`,
  );
  if (result.bankName) lines.push(`Bank: ${result.bankName}`);
  lines.push("");

  lines.push("date|direction|amount|category|counterparty|balance");
  for (const tx of result.transactions) {
    const row = [
      tx.date,
      tx.direction,
      tx.amount.toFixed(2),
      tx.category,
      tx.counterparty ?? "—",
      tx.balanceAfter !== undefined ? tx.balanceAfter.toFixed(2) : "—",
    ].join("|");
    lines.push(row);
  }

  return lines.join("\n");
}
