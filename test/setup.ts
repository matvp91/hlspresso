import fetchMock from "fetch-mock";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

const BASE_URL = "http://hlspresso.test";

beforeAll(() => {
  fetchMock.mockGlobal();
  vi.stubEnv("BASE_URL", BASE_URL);
  vi.stubEnv("LOG_LEVEL", "silent");
});

afterEach(() => {
  fetchMock.removeRoutes();
  fetchMock.clearHistory();
});

afterAll(() => {
  fetchMock.unmockGlobal();
  vi.unstubAllEnvs();
});
