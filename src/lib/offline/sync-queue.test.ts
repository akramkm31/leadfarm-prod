import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  enqueueSyncJob,
  flushSyncQueue,
  getPendingJobs,
} from "@/lib/offline/sync-queue";

const store: Record<string, string> = {};

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  } satisfies Storage);
  vi.stubGlobal("crypto", {
    randomUUID: () => `job-${Math.random().toString(36).slice(2)}`,
  });
});

describe("offline sync queue", () => {
  it("enqueues and flushes jobs when executor succeeds", async () => {
    enqueueSyncJob({
      table: "treatments",
      action: "update_status",
      treatmentId: "t-1",
      payload: { status: "completed" },
    });
    expect(getPendingJobs()).toHaveLength(1);

    const result = await flushSyncQueue(async () => true);
    expect(result.flushed).toBe(1);
    expect(getPendingJobs()).toHaveLength(0);
  });

  it("retains jobs when executor fails", async () => {
    enqueueSyncJob({
      table: "treatments",
      action: "update_status",
      treatmentId: "t-2",
      payload: { status: "completed" },
    });

    const result = await flushSyncQueue(async () => false);
    expect(result.failed).toBe(1);
    expect(getPendingJobs()).toHaveLength(1);
  });
});
