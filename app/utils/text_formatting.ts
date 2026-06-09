export function extractTransactions(text: string) {
  console.log(text);
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);

  // Find the header row(s) that describe transaction columns
  const headerInfo = detectTableHeader(lines);
  if (!headerInfo) {
    console.log("No table header detected, attempting generic parsing");
    return parseGenericTransactions(lines);
  }

  const transactions = groupAndParseTransactions(lines, headerInfo);
  return transactions;
}

interface HeaderInfo {
  headerIndices: number[];
  columns: ColumnInfo[];
}

interface ColumnInfo {
  name: string;
  position: number;
  type: 'date' | 'time' | 'amount' | 'description' | 'balance' | 'category' | 'unknown';
}

function detectTableHeader(lines: string[]): HeaderInfo | null {
  // Look for lines that contain keywords commonly found in transaction table headers
  const headerKeywords = ['date', 'time', 'debit', 'credit', 'amount', 'balance', 'description', 'narration', 'money in', 'money out', 'category', 'to/from', 'trans', 'chq'];

  for (let i = 0; i < Math.min(lines.length, 50); i++) {
    const line = lines[i].toLowerCase();
    const keywordMatches = headerKeywords.filter(kw => line.includes(kw));

    // If line contains multiple header keywords, it's likely a header
    if (keywordMatches.length >= 2) {
      return parseHeaderRow(lines[i], headerKeywords);
    }
  }

  return null;
}

function parseHeaderRow(headerLine: string, knownKeywords: string[]): HeaderInfo | null {
  const columns: ColumnInfo[] = [];

  // Split by whitespace but preserve position info
  const tokens = headerLine.toLowerCase().split(/\s+/);
  let charPos = 0;

  for (const token of tokens) {
    const matchedKeyword = knownKeywords.find(kw => token.includes(kw));

    if (matchedKeyword) {
      charPos = headerLine.toLowerCase().indexOf(matchedKeyword, charPos);

      const type = classifyColumnType(matchedKeyword);
      columns.push({
        name: matchedKeyword,
        position: charPos,
        type
      });

      charPos += matchedKeyword.length;
    }
  }

  if (columns.length >= 2) {
    return { headerIndices: [], columns };
  }

  return null;
}

function classifyColumnType(columnName: string): ColumnInfo['type'] {
  if (columnName.includes('date')) return 'date';
  if (columnName.includes('time')) return 'time';
  if (columnName.includes('debit') || columnName.includes('money out') || columnName.includes('money out')) return 'amount';
  if (columnName.includes('credit') || columnName.includes('money in')) return 'amount';
  if (columnName.includes('balance')) return 'balance';
  if (columnName.includes('description') || columnName.includes('narration') || columnName.includes('to/from')) return 'description';
  if (columnName.includes('category')) return 'category';
  return 'unknown';
}

function groupAndParseTransactions(lines: string[], headerInfo: HeaderInfo) {
  const transactions: any[] = [];
  let currentTransaction: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a new transaction (contains a date)
    if (containsDate(line)) {
      // Save previous transaction if exists
      if (currentTransaction && (currentTransaction.moneyIn || currentTransaction.moneyOut)) {
        transactions.push(currentTransaction);
      }

      // Start new transaction
      currentTransaction = {
        date: extractDate(line),
        time: extractTime(line),
        description: extractLineContent(line),
        moneyIn: null,
        moneyOut: null,
        balance: null
      };
    } else if (currentTransaction) {
      // This is a continuation of the current transaction
      // Try to extract amounts and balance
      const amounts = extractAmounts(line);

      if (amounts.length > 0) {
        // Line contains monetary values
        if (!currentTransaction.moneyIn && !currentTransaction.moneyOut) {
          // Assign to in/out based on heuristics
          const { inAmount, outAmount, balance } = classifyAmounts(amounts, line);
          if (inAmount) currentTransaction.moneyIn = inAmount;
          if (outAmount) currentTransaction.moneyOut = outAmount;
          if (balance) currentTransaction.balance = balance;
        } else {
          // This might be the balance line
          const balanceAmount = amounts[amounts.length - 1];
          currentTransaction.balance = balanceAmount;
        }
      } else {
        // No amounts, likely description continuation
        currentTransaction.description += ' ' + line;
      }
    }
  }

  // Don't forget the last transaction
  if (currentTransaction && (currentTransaction.moneyIn || currentTransaction.moneyOut)) {
    transactions.push(currentTransaction);
  }

  return transactions;
}

function parseGenericTransactions(lines: string[]) {
  const transactions: any[] = [];
  let currentTransaction: any = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (containsDate(line)) {
      if (currentTransaction && (currentTransaction.moneyIn || currentTransaction.moneyOut)) {
        transactions.push(currentTransaction);
      }

      currentTransaction = {
        date: extractDate(line),
        time: extractTime(line),
        description: extractLineContent(line),
        moneyIn: null,
        moneyOut: null,
        balance: null
      };
    } else if (currentTransaction) {
      const amounts = extractAmounts(line);

      if (amounts.length > 0) {
        if (!currentTransaction.moneyIn && !currentTransaction.moneyOut) {
          const { inAmount, outAmount, balance } = classifyAmounts(amounts, line);
          if (inAmount) currentTransaction.moneyIn = inAmount;
          if (outAmount) currentTransaction.moneyOut = outAmount;
          if (balance) currentTransaction.balance = balance;
        } else {
          const balanceAmount = amounts[amounts.length - 1];
          currentTransaction.balance = balanceAmount;
        }
      } else {
        currentTransaction.description += ' ' + line;
      }
    }
  }

  if (currentTransaction && (currentTransaction.moneyIn || currentTransaction.moneyOut)) {
    transactions.push(currentTransaction);
  }

  return transactions;
}

function containsDate(line: string): boolean {
  // Match various date formats: DD/MM/YY, DD-MMM-YYYY, DD/MM/YYYY, etc.
  const datePatterns = [
    /\d{1,2}\/\d{1,2}\/\d{2,4}/,           // DD/MM/YY or DD/MM/YYYY
    /\d{1,2}\-[A-Z][a-z]{2}\-\d{2,4}/i,    // DD-MMM-YYYY
    /\d{1,2}\/[A-Z][a-z]{2}\/\d{2,4}/i,    // DD/MMM/YYYY
    /\d{1,2}\s+[A-Z][a-z]{2}\s+\d{2,4}/i,  // DD MMM YYYY
  ];

  return datePatterns.some(pattern => pattern.test(line));
}

function extractDate(line: string): string | null {
  const datePatterns = [
    /(\d{1,2}\/\d{1,2}\/\d{2,4})/,           // DD/MM/YY
    /(\d{1,2}\-[A-Z][a-z]{2}\-\d{2,4})/i,    // DD-MMM-YYYY
    /(\d{1,2}\/[A-Z][a-z]{2}\/\d{2,4})/i,    // DD/MMM/YYYY
    /(\d{1,2}\s+[A-Z][a-z]{2}\s+\d{2,4})/i,  // DD MMM YYYY
  ];

  for (const pattern of datePatterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }

  return null;
}

function extractTime(line: string): string | null {
  const timePattern = /(\d{1,2}:\d{2}(?::\d{2})?)/;
  const match = line.match(timePattern);
  return match ? match[1] : null;
}

function extractLineContent(line: string): string {
  // Remove dates and times to get the description part
  let content = line
    .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '')
    .replace(/\d{1,2}\-[A-Z][a-z]{2}\-\d{2,4}/gi, '')
    .replace(/\d{1,2}:\d{2}:\d{2}/g, '')
    .replace(/\d{1,2}:\d{2}/g, '')
    .trim();

  return content;
}

function extractAmounts(line: string): string[] {
  // Find all currency amounts (both ₦ and regular numbers that look like money)
  const amountPattern = /₦?([\d,]+\.?\d*)/g;
  const matches = line.match(amountPattern) || [];

  // Filter out very small numbers that are unlikely to be amounts
  return matches
    .map(m => m.replace('₦', ''))
    .filter(amount => {
      const num = parseFloat(amount.replace(/,/g, ''));
      return num > 0.01; // Filter out tiny amounts
    });
}

function classifyAmounts(amounts: string[], line: string): { inAmount: string | null; outAmount: string | null; balance: string | null } {
  let inAmount: string | null = null;
  let outAmount: string | null = null;
  let balance: string | null = null;

  // Heuristics to classify amounts
  const lineLower = line.toLowerCase();

  if (amounts.length === 1) {
    // Single amount - likely money in or balance
    if (lineLower.includes('reversal') || lineLower.includes('refund') || lineLower.includes('credit') || lineLower.includes('money in') || lineLower.includes('transfer from')) {
      inAmount = amounts[0];
    } else if (lineLower.includes('debit') || lineLower.includes('purchase') || lineLower.includes('money out') || lineLower.includes('transfer to')) {
      outAmount = amounts[0];
    } else {
      // Default to balance if unclear
      balance = amounts[0];
    }
  } else if (amounts.length === 2) {
    // Two amounts - typically debit and credit
    if (lineLower.includes('debit') || lineLower.includes('money out') || lineLower.includes('purchase')) {
      outAmount = amounts[0];
      inAmount = amounts[1];
    } else if (lineLower.includes('credit') || lineLower.includes('money in')) {
      inAmount = amounts[0];
      outAmount = amounts[1];
    } else {
      // Assume first is out, second is in
      outAmount = amounts[0];
      inAmount = amounts[1];
    }
  } else if (amounts.length >= 3) {
    // Multiple amounts - typically debit, credit, and balance
    outAmount = amounts[0];
    inAmount = amounts[1];
    balance = amounts[amounts.length - 1];
  }

  // Clean up zero amounts
  if (inAmount === '0' || inAmount === '0.00') inAmount = null;
  if (outAmount === '0' || outAmount === '0.00') outAmount = null;

  return { inAmount, outAmount, balance };
}
