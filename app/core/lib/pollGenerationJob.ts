export interface GenerationJobState {
  status: string;
}

interface PollGenerationJobOptions<T extends GenerationJobState> {
  initial: T;
  getJob: (signal: AbortSignal) => Promise<T>;
  maxPolls: number;
  signal: AbortSignal;
  onUpdate?: (job: T) => void;
}

const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'SUPERSEDED', 'CANCELLED']);

function abortError(): Error {
  const error = new Error('Generation polling was cancelled.');
  error.name = 'AbortError';
  return error;
}

function waitForPoll(status: string, signal: AbortSignal): Promise<void> {
  const delay = status === 'PROCESSING' ? 1_500 : 1_000;
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
      return;
    }
    const timer = globalThis.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    const onAbort = () => {
      globalThis.clearTimeout(timer);
      reject(abortError());
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export async function pollGenerationJob<T extends GenerationJobState>({
  initial,
  getJob,
  maxPolls,
  signal,
  onUpdate,
}: PollGenerationJobOptions<T>): Promise<T> {
  let current = initial;
  for (let attempt = 0; attempt < maxPolls && !TERMINAL_STATUSES.has(current.status); attempt += 1) {
    await waitForPoll(current.status, signal);
    if (signal.aborted) throw abortError();
    current = await getJob(signal);
    if (signal.aborted) throw abortError();
    onUpdate?.(current);
  }
  return current;
}
