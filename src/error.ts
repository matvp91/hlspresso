import { z } from "@hono/zod-openapi";
import { createErrorMap } from "zod-validation-error";

z.config({
  customError: createErrorMap(),
});

export const errorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "ROUTE_NOT_FOUND",
  "SESSION_NOT_FOUND",
  "SESSION_STORE_UNAVAILABLE",
  "FETCH_ORIGIN_FAILED",
  "INVALID_ORIGIN_PLAYLIST",
  "FETCH_STATIC_ASSET_FAILED",
  "INVALID_STATIC_ASSET_PLAYLIST",
  "FETCH_VMAP_FAILED",
  "INVALID_VMAP_RESPONSE",
  "FETCH_VAST_FAILED",
  "INVALID_VAST_RESPONSE",
  "INTERNAL_SERVER_ERROR",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const errorDetailSchema = z.object({
  field: z.string().optional(),
  message: z.string(),
});

export type ErrorDetail = z.infer<typeof errorDetailSchema>;

export const errorResponseSchema = z
  .object({
    requestId: z.string(),
    error: z.object({
      code: errorCodeSchema,
      message: z.string(),
      details: z.array(errorDetailSchema).optional(),
    }),
  })
  .openapi("ErrorResponse");

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export type ErrorStatus = 400 | 404 | 500 | 502 | 503;

const errorStatuses = {
  INVALID_REQUEST: 400,
  ROUTE_NOT_FOUND: 404,
  SESSION_NOT_FOUND: 404,
  SESSION_STORE_UNAVAILABLE: 503,
  FETCH_ORIGIN_FAILED: 502,
  INVALID_ORIGIN_PLAYLIST: 502,
  FETCH_STATIC_ASSET_FAILED: 502,
  INVALID_STATIC_ASSET_PLAYLIST: 502,
  FETCH_VMAP_FAILED: 502,
  INVALID_VMAP_RESPONSE: 502,
  FETCH_VAST_FAILED: 502,
  INVALID_VAST_RESPONSE: 502,
  INTERNAL_SERVER_ERROR: 500,
} satisfies Record<ErrorCode, ErrorStatus>;

type ApiErrorOptions = {
  code: ErrorCode;
  message: string;
  details?: ErrorDetail[];
  cause?: unknown;
};

/** An expected API failure whose contents are safe to return to a client. */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status: ErrorStatus;
  public readonly details?: ErrorDetail[];

  constructor({ code, message, details, cause }: ApiErrorOptions) {
    super(message, { cause });
    this.name = "ApiError";
    this.code = code;
    this.status = errorStatuses[code];
    this.details = details;
  }
}

const validationTargetNames: Record<string, string> = {
  cookie: "cookies",
  form: "form body",
  header: "headers",
  json: "JSON body",
  param: "path parameters",
  query: "query parameters",
};

export function fromRequestValidationError(
  error: z.ZodError,
  target?: string,
): ApiError {
  const targetName = target
    ? (validationTargetNames[target] ?? target)
    : "data";

  return new ApiError({
    code: "INVALID_REQUEST",
    message: `The request ${targetName} is invalid.`,
    details: error.issues.map((issue) => ({
      field: issue.path.length
        ? issue.path.map((part) => String(part)).join(".")
        : undefined,
      message: issue.message,
    })),
    cause: error,
  });
}

export function handleApiError(
  error: unknown,
  requestId: string,
): { body: ErrorResponse; status: ErrorStatus; expected: boolean } {
  if (error instanceof ApiError) {
    return {
      body: {
        requestId,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      status: error.status,
      expected: true,
    };
  }

  return {
    body: {
      requestId,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected server error occurred.",
      },
    },
    status: 500,
    expected: false,
  };
}
