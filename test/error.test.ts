import { z } from "@hono/zod-openapi";
import { describe, expect, test } from "vitest";
import {
  ApiError,
  fromRequestValidationError,
  handleApiError,
} from "../src/error";

describe("API errors", () => {
  test("returns expected errors in the public envelope", () => {
    const cause = new Error("private failure");
    const result = handleApiError(
      new ApiError({
        code: "FETCH_ORIGIN_FAILED",
        message: "Could not fetch the source HLS playlist.",
        cause,
      }),
      "req-123",
    );

    expect(result).toEqual({
      body: {
        requestId: "req-123",
        error: {
          code: "FETCH_ORIGIN_FAILED",
          message: "Could not fetch the source HLS playlist.",
          details: undefined,
        },
      },
      status: 502,
      expected: true,
    });
    expect(JSON.stringify(result.body)).not.toContain("private failure");
  });

  test("sanitizes unexpected errors", () => {
    const result = handleApiError(
      new Error("Redis password was rejected"),
      "req-456",
    );

    expect(result).toEqual({
      body: {
        requestId: "req-456",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected server error occurred.",
        },
      },
      status: 500,
      expected: false,
    });
  });

  test("turns request validation errors into field details", () => {
    const schema = z.object({
      interstitials: z.array(
        z.object({
          assets: z.array(
            z.object({ url: z.url({ error: "Must be a valid URL." }) }),
          ),
        }),
      ),
    });
    const parsed = schema.safeParse({
      interstitials: [{ assets: [{ url: "not a URL" }] }],
    });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const error = fromRequestValidationError(parsed.error, "json");
    const result = handleApiError(error, "req-789");

    expect(result.status).toBe(400);
    expect(result.body.error.message).toBe("The request JSON body is invalid.");
    expect(result.body.error.details).toEqual([
      {
        field: "interstitials.0.assets.0.url",
        message: "Must be a valid URL.",
      },
    ]);
  });

  test("does not mistake internal Zod errors for request errors", () => {
    const parsed = z.object({ id: z.string() }).safeParse({ id: 42 });
    expect(parsed.success).toBe(false);
    if (parsed.success) {
      return;
    }

    const result = handleApiError(parsed.error, "req-internal");

    expect(result.status).toBe(500);
    expect(result.body.error.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
