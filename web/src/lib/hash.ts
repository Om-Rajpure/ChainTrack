import { ethers } from "ethers";

export interface ProductHashInput {
  serialNumber: string;
  name: string;
  category: string;
  description?: string | null;
  batchNumber: string;
  manufacturingDate: string | Date;
  manufacturerWallet: string;
  attributes?: Record<string, unknown> | null;
  imageHash?: string | null;
}

/**
 * Recursively sort object keys in alphabetical order.
 */
export function sortObjectKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(value as Record<string, unknown>).sort();

  for (const key of keys) {
    const val = (value as Record<string, unknown>)[key];
    if (val !== undefined) {
      sortedObj[key] = sortObjectKeys(val);
    }
  }

  return sortedObj;
}

/**
 * Formats a Date object or date string to standard ISO 'YYYY-MM-DD'.
 */
export function formatDateOnly(date: string | Date): string {
  if (date instanceof Date) {
    return date.toISOString().split("T")[0];
  }
  if (typeof date === "string") {
    const trimmed = date.trim();
    if (trimmed.includes("T")) {
      return trimmed.split("T")[0];
    }
    return trimmed;
  }
  throw new Error("Invalid date provided for hashing");
}

/**
 * Constructs the canonical metadata object adhering to Section B5 specification:
 * - Omits empty/null optional fields (description, attributes, imageHash)
 * - Normalizes manufacturingDate to YYYY-MM-DD
 * - Normalizes manufacturerWallet to lowercase
 * - Trims string fields
 * - Recursively sorts keys alphabetically
 */
export function buildCanonicalObject(input: ProductHashInput): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    serialNumber: input.serialNumber.trim(),
    name: input.name.trim(),
    category: input.category.trim(),
    batchNumber: input.batchNumber.trim(),
    manufacturingDate: formatDateOnly(input.manufacturingDate),
    manufacturerWallet: input.manufacturerWallet.trim().toLowerCase(),
  };

  if (input.description && input.description.trim().length > 0) {
    raw.description = input.description.trim();
  }

  if (
    input.attributes &&
    typeof input.attributes === "object" &&
    Object.keys(input.attributes).length > 0
  ) {
    raw.attributes = input.attributes;
  }

  if (input.imageHash && input.imageHash.trim().length > 0) {
    raw.imageHash = input.imageHash.trim();
  }

  return sortObjectKeys(raw) as Record<string, unknown>;
}

/**
 * Builds the canonical JSON string with sorted keys and no whitespace.
 */
export function buildCanonicalJson(input: ProductHashInput): string {
  const canonicalObj = buildCanonicalObject(input);
  return JSON.stringify(canonicalObj);
}

/**
 * Computes keccak256 hash of UTF-8 encoded canonical JSON string.
 * Returns 0x + 64 hex characters (bytes32).
 */
export function computeProductHash(input: ProductHashInput): string {
  const canonicalJson = buildCanonicalJson(input);
  const utf8Bytes = ethers.toUtf8Bytes(canonicalJson);
  return ethers.keccak256(utf8Bytes);
}
