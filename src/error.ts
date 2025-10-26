import type { ValueOf } from "./types";

export const ApiErrorCode = {
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
} as const;

export type ApiErrorCode = ValueOf<typeof ApiErrorCode>;

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message?: string,
  ) {
    super(`ApiError ${code}${message ? ` - ${message}` : ""}`);
  }
}
