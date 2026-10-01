import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return NextResponse.json({ data, ...data }, { status });
  }
  return NextResponse.json({ data }, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function apiValidationError(error: ZodError): NextResponse<ApiErrorResponse> {
  const issues = error.issues.map((i) => ({
    field: i.path.join("."),
    message: i.message,
  }));
  return apiError(
    "VALIDATION_ERROR",
    issues[0]?.message || "Validation failed on submitted payload",
    400,
    issues
  );
}

export function handleApiError(err: unknown): NextResponse<ApiErrorResponse> {
  if (err instanceof ApiError) {
    return apiError(err.code, err.message, err.status, err.details);
  }
  if (err instanceof ZodError) {
    return apiValidationError(err);
  }

  console.error("Unhandled API Error:", err);
  return apiError(
    "INTERNAL_ERROR",
    "An unexpected error occurred while processing the request",
    500
  );
}
