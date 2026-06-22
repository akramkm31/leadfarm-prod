const QUEUE_KEY = "lf_sync_queue_v1";

export type SyncJob = {
  id: string;
  table: "treatments";
  action: "update_status";
  payload: Record<string, unknown>;
  treatmentId: string;
  createdAt: string;
  retries: number;
};

function storage(): Storage | null {
  return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null;
}

function readQueue(): SyncJob[] {
  const ls = storage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as SyncJob[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(jobs: SyncJob[]): void {
  const ls = storage();
  if (!ls) return;
  ls.setItem(QUEUE_KEY, JSON.stringify(jobs));
}

export function enqueueSyncJob(
  job: Omit<SyncJob, "id" | "createdAt" | "retries">
): SyncJob {
  const entry: SyncJob = {
    ...job,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  const queue = readQueue();
  queue.push(entry);
  writeQueue(queue);
  return entry;
}

export function getPendingJobs(): SyncJob[] {
  return readQueue();
}

export function removeJob(id: string): void {
  writeQueue(readQueue().filter((j) => j.id !== id));
}

export function bumpRetry(id: string): void {
  writeQueue(
    readQueue().map((j) => (j.id === id ? { ...j, retries: j.retries + 1 } : j))
  );
}

/** Replay queued mutations when back online. */
export async function flushSyncQueue(
  executor: (job: SyncJob) => Promise<boolean>
): Promise<{ flushed: number; failed: number }> {
  let flushed = 0;
  let failed = 0;
  for (const job of [...readQueue()]) {
    try {
      const ok = await executor(job);
      if (ok) {
        removeJob(job.id);
        flushed++;
      } else {
        bumpRetry(job.id);
        failed++;
      }
    } catch {
      bumpRetry(job.id);
      failed++;
    }
  }
  return { flushed, failed };
}
