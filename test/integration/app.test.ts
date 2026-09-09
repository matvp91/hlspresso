import { describe, expect, test } from "vitest";
import { app } from "../../src/app";

describe("app", () => {
  describe("documentation", () => {
    test("serves its OpenAPI document", async () => {
      const response = await app.request("http://hlspresso.test/api/v1/doc");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.info.title).toBe("HLSpresso");
      expect(data.paths["/api/v1/sessions"].post).toBeDefined();
    });
  });

  describe("middleware", () => {
    test("returns a public error for unknown routes", async () => {
      const response = await app.request("http://hlspresso.test/unknown");
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.requestId).toEqual(expect.any(String));
      expect(data.error).toMatchObject({
        code: "ROUTE_NOT_FOUND",
        message: "No route matches GET /unknown.",
      });
    });

    test("adds CORS and request-id headers", async () => {
      const response = await app.request("http://hlspresso.test/unknown", {
        headers: { Origin: "https://client.test" },
      });

      expect(response.headers.get("access-control-allow-origin")).toBe("*");
      expect(response.headers.get("x-request-id")).toEqual(expect.any(String));
    });
  });
});
