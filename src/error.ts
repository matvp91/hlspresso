import { z } from "@hono/zod-openapi";
import { createErrorMap, fromError } from "zod-validation-error";

z.config({
  customError: createErrorMap(),
});

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "NOT_FOUND",
  "UNPROCESSABLE_ENTITY",
  "INTERNAL_SERVER_ERROR",
]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

const errorCodeToHttpStatus: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

function fromZodError(error: z.ZodError): ErrorResponse {
  const validationError = fromError(error);
  return {
    error: {
      code: "UNPROCESSABLE_ENTITY",
      message: validationError.toString(),
    },
  };
}

export class ApiError extends Error {
  public readonly code: ErrorCode;

  constructor({
    code,
    message,
  }: {
    code: ErrorCode;
    message: string;
  }) {
    super(message);
    this.code = code;
  }
}

export function handleApiError(
  error: unknown,
): ErrorResponse & { status: number } {
  if (error instanceof ApiError) {
    return {
      error: {
        code: error.code,
        message: error.message,
      },
      status: errorCodeToHttpStatus[error.code],
    };
  }

  // Zod errors
  if (error instanceof z.ZodError) {
    return {
      ...fromZodError(error),
      status: errorCodeToHttpStatus.UNPROCESSABLE_ENTITY,
    };
  }

  return {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred.",
    },
    status: errorCodeToHttpStatus.INTERNAL_SERVER_ERROR,
  };
}
