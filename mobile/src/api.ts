import { BACKEND_URL } from './config';
import { JobResponse } from './types';

// The free Render backend spins down after 15 min idle, so the first request after a
// while can fail to connect while it's waking up rather than just being slow. Retry a
// few times with a delay instead of surfacing an error immediately.
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  attempts = 4,
  delayMs = 4000,
): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetch(url, options);
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) {
        await new Promise<void>(resolve => setTimeout(() => resolve(), delayMs));
      }
    }
  }
  throw lastErr;
}

export async function createJob(urls: string[], note?: string): Promise<JobResponse> {
  const res = await fetchWithRetry(`${BACKEND_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urls, note: note && note.trim() ? note.trim() : undefined }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Couldn't reach the backend to start extraction (${res.status}). ${body}`);
  }
  return res.json();
}

export async function getJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${BACKEND_URL}/jobs/${jobId}`);
  if (!res.ok) {
    throw new Error(`Couldn't check extraction status (${res.status}).`);
  }
  return res.json();
}

export function pollJob(
  jobId: string,
  onUpdate: (job: JobResponse) => void,
  intervalMs = 2500,
): { promise: Promise<JobResponse>; cancel: () => void } {
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const promise = new Promise<JobResponse>((resolve, reject) => {
    const tick = async () => {
      if (cancelled) return;
      try {
        const job = await getJob(jobId);
        if (cancelled) return;
        onUpdate(job);
        if (job.status === 'done' || job.status === 'error') {
          resolve(job);
          return;
        }
        timer = setTimeout(tick, intervalMs);
      } catch (e) {
        if (!cancelled) reject(e);
      }
    };
    tick();
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    },
  };
}
