import { z } from "zod";
import { ethers } from "ethers";

/**
 * Validates Ethereum wallet address format (42 hex chars starting with 0x).
 */
export const ethereumAddressSchema = z
  .string()
  .trim()
  .refine((val) => ethers.isAddress(val), {
    message: "Invalid Ethereum address format",
  })
  .transform((val) => val.toLowerCase());

/**
 * Validates UTF-8 byte length for strings (Solidity byte constraints).
 */
export const byteLength = (maxBytes: number, minBytes = 0) =>
  z.string().refine(
    (val) => {
      const len = Buffer.byteLength(val, "utf8");
      return len >= minBytes && len <= maxBytes;
    },
    {
      message: `Byte length must be between ${minBytes} and ${maxBytes} bytes`,
    }
  );

export const roleEnumSchema = z.enum(["MANUFACTURER", "DISTRIBUTOR", "RETAILER"]);
export const productStatusEnumSchema = z.enum([
  "CREATED",
  "IN_TRANSIT",
  "AT_DISTRIBUTOR",
  "AT_RETAILER",
  "SOLD",
]);

/**
 * Schema for creating a product draft (POST /api/products/draft).
 */
export const createProductDraftSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be <= 100 characters"),
  category: z.string().trim().min(1, "Category is required").max(50, "Category must be <= 50 characters"),
  description: z.string().trim().max(1000, "Description must be <= 1000 characters").optional().nullable(),
  batchNumber: z.string().trim().min(1, "Batch number is required").max(50, "Batch number must be <= 50 characters"),
  manufacturingDate: z
    .string()
    .trim()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid manufacturing date" })
    .refine(
      (val) => {
        const inputDate = new Date(val);
        const today = new Date();
        // Allow up to today end of day UTC
        return inputDate.getTime() <= today.getTime() + 86400000;
      },
      { message: "Manufacturing date cannot be in the future" }
    ),
  manufacturerWallet: ethereumAddressSchema,
  attributes: z
    .record(z.string().max(40, "Attribute key must be <= 40 chars"), z.string().max(200, "Attribute value must be <= 200 chars"))
    .optional()
    .nullable()
    .refine(
      (attrs) => {
        if (!attrs) return true;
        return Object.keys(attrs).length <= 20;
      },
      { message: "Attributes object cannot exceed 20 keys" }
    ),
  imageUrl: z.string().url("Invalid image URL").optional().nullable(),
  imageHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid image hash format").optional().nullable(),
});

/**
 * Schema for confirming a product on-chain (POST /api/products/confirm).
 */
export const confirmProductSchema = z.object({
  draftId: z.string().min(1, "draftId is required"),
  productId: z.number().int().positive("productId must be a positive integer"),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format"),
});

/**
 * Schema for participant registration/profile (POST /api/participants).
 */
export const createParticipantProfileSchema = z.object({
  walletAddress: ethereumAddressSchema,
  role: roleEnumSchema,
  organizationName: z.string().trim().min(1, "Organization name is required").max(100, "Organization name must be <= 100 characters"),
  contactEmail: z.string().trim().email("Invalid email address"),
  location: byteLength(100, 1).optional().nullable(),
});

/**
 * Schema for updating participant profile (PATCH /api/participants/:address).
 */
export const patchParticipantProfileSchema = z.object({
  organizationName: z.string().trim().min(1).max(100).optional(),
  contactEmail: z.string().trim().email().optional(),
  location: byteLength(100, 0).optional().nullable(),
});

/**
 * Schema for Auth Nonce request (GET /api/auth/nonce?address=0x...).
 */
export const authNonceQuerySchema = z.object({
  address: ethereumAddressSchema,
});

/**
 * Schema for Auth Verify (POST /api/auth/verify).
 */
export const authVerifySchema = z.object({
  address: ethereumAddressSchema,
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, "Invalid signature format"),
  nonce: z.string().min(1, "Nonce is required"),
});

/**
 * Schema for product queries (GET /api/products).
 */
export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().trim().optional(),
  status: productStatusEnumSchema.optional(),
  search: z.string().trim().optional(),
  owner: ethereumAddressSchema.optional(),
  manufacturer: ethereumAddressSchema.optional(),
});
