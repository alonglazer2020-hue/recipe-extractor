import { BACKEND_URL } from './config';
import { JobResponse } from './types';

export async function createJob(url: string): Promise<JobResponse> {
  const res = await fetch(`${BACKEND_URL}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
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
