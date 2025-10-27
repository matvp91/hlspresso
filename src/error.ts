export type ApiErrorCode = "SESSION_NOT_FOUND" | "PARSE_ERROR";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message?: string,
  ) {
    super(`ApiError ${code}${message ? ` - ${message}` : ""}`);
  }
}
