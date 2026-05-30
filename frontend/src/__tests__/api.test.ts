/**
 * Unit tests for api.ts service functions.
 * Uses vitest globals (globals: true in vitest.config.ts).
 */
import {
  extractVideoId,
  isValidYouTubeUrl,
  fetchHistory,
  getLocalHistory,
  saveToHistory,
} from "../services/api";

// ── URL extraction ──────────────────────────────────────────────

test("extractVideoId v= param", () => {
  expect(extractVideoId("https://youtube.com/watch?v=abc123xyz78")).toBe("abc123xyz78");
  expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  expect(extractVideoId("https://youtube.com/watch?v=abc123xyz78&list=PLxxx")).toBe("abc123xyz78");
});

test("extractVideoId youtu.be short URL", () => {
  expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
});

test("extractVideoId /v/ format", () => {
  expect(extractVideoId("https://youtube.com/v/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
});

test("extractVideoId /embed/ format", () => {
  expect(extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
});

test("extractVideoId bare 11-char ID", () => {
  expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
});

test("extractVideoId returns null for invalid URLs", () => {
  expect(extractVideoId("")).toBeNull();
  expect(extractVideoId("https://example.com")).toBeNull();
  expect(extractVideoId("https://youtube.com/")).toBeNull();
  expect(extractVideoId("abc")).toBeNull();
  expect(extractVideoId("abcdefghijklm")).toBeNull();
});

// ── isValidYouTubeUrl ───────────────────────────────────────────

test("isValidYouTubeUrl returns true for valid URLs", () => {
  expect(isValidYouTubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")).toBe(true);
  expect(isValidYouTubeUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(true);
  expect(isValidYouTubeUrl("dQw4w9WgXcQ")).toBe(true);
});

test("isValidYouTubeUrl returns false for invalid URLs", () => {
  expect(isValidYouTubeUrl("")).toBe(false);
  expect(isValidYouTubeUrl("not-a-url")).toBe(false);
  expect(isValidYouTubeUrl("https://vimeo.com/123456")).toBe(false);
});

// ── getLocalHistory ──────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

test("getLocalHistory returns empty array when storage is empty", () => {
  expect(getLocalHistory()).toEqual([]);
});

test("getLocalHistory returns parsed array from storage", () => {
  const history = [{ videoId: "vid1" }, { videoId: "vid2" }];
  localStorage.setItem("NeuroTube_history", JSON.stringify(history));
  expect(getLocalHistory()).toEqual(history);
});

test("getLocalHistory returns empty array on corrupted JSON", () => {
  localStorage.setItem("NeuroTube_history", "not valid json {{{");
  expect(getLocalHistory()).toEqual([]);
});

// ── saveToHistory ────────────────────────────────────────────────

test("saveToHistory adds video at front of history", () => {
  const existing = [{ videoId: "existing" }];
  localStorage.setItem("NeuroTube_history", JSON.stringify(existing));
  saveToHistory({ videoId: "new" });
  expect(getLocalHistory()[0].videoId).toBe("new");
});

test("saveToHistory replaces duplicate videoId", () => {
  const existing = [{ videoId: "dup" }, { videoId: "other" }];
  localStorage.setItem("NeuroTube_history", JSON.stringify(existing));
  saveToHistory({ videoId: "dup" });
  const result = getLocalHistory();
  expect(result.filter((v) => v.videoId === "dup")).toHaveLength(1);
  expect(result).toHaveLength(2);
});

test("saveToHistory caps history at 20 items", () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ videoId: `v${i}` }));
  localStorage.setItem("NeuroTube_history", JSON.stringify(many));
  saveToHistory({ videoId: "newest" });
  expect(getLocalHistory()).toHaveLength(20);
  expect(getLocalHistory()[0].videoId).toBe("newest");
});
