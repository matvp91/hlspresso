import { app } from "../../src/app";

export function createSession(params: unknown) {
  return app.request("http://hlspresso.test/api/v1/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}
