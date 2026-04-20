const moneyPattern = /^\d*(?:\.\d{0,2})?$/;

export function normalizeMoneyInput(value: string): string {
  const cleaned = value.replace(/[￥¥,\s]/g, "").trim();

  if (!cleaned) {
    return "";
  }

  if (moneyPattern.test(cleaned)) {
    return cleaned;
  }

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return "";
  }

  return parsed.toFixed(2);
}

export function parseMoneyToCents(value: string): number {
  const normalized = normalizeMoneyInput(value);

  if (!normalized) {
    return 0;
  }

  const [intPart, decimalPart = ""] = normalized.split(".");
  const major = Number.parseInt(intPart || "0", 10);
  const minor = Number.parseInt((decimalPart + "00").slice(0, 2), 10);

  if (!Number.isFinite(major) || !Number.isFinite(minor)) {
    return 0;
  }

  return major * 100 + minor;
}

export function centsToMoneyText(cents: number): string {
  const safeCents = Number.isFinite(cents) ? Math.trunc(cents) : 0;
  const sign = safeCents < 0 ? "-" : "";
  const absolute = Math.abs(safeCents);
  const major = Math.floor(absolute / 100);
  const minor = String(absolute % 100).padStart(2, "0");

  return `${sign}${major}.${minor}`;
}

export function centsToCurrency(cents: number): string {
  return `¥${centsToMoneyText(cents)}`;
}

export function sumCents(values: number[]): number {
  return values.reduce((total, value) => total + (Number.isFinite(value) ? Math.trunc(value) : 0), 0);
}

export function parseIntegerInput(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
