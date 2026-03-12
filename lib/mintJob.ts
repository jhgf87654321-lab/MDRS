export type MintJobStatus = 'idle' | 'running' | 'done' | 'error';

export type MintJobResult = {
  imageDataUrl: string;
  serialNumber: string;
  isSpecial: boolean;
  theme: string;
  rarity: string;
  prompt: string;
  cosUrl?: string;
};

export type MintJobSnapshot = {
  status: MintJobStatus;
  startedAt?: number;
  finishedAt?: number;
  result?: MintJobResult;
  error?: string;
};

const EVENT_NAME = 'axon:mint-job';

type MintJobState = {
  snapshot: MintJobSnapshot;
  promise: Promise<MintJobResult> | null;
};

function getState(): MintJobState {
  const w = window as any;
  if (!w.__axonMintJob) {
    w.__axonMintJob = {
      snapshot: { status: 'idle' } satisfies MintJobSnapshot,
      promise: null,
    } satisfies MintJobState;
  }
  return w.__axonMintJob as MintJobState;
}

function emit() {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getState().snapshot }));
}

export function getMintJobSnapshot(): MintJobSnapshot {
  return getState().snapshot;
}

export function subscribeMintJob(cb: (snap: MintJobSnapshot) => void) {
  const handler = (ev: Event) => {
    const detail = (ev as CustomEvent).detail as MintJobSnapshot | undefined;
    cb(detail ?? getMintJobSnapshot());
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function startMintJob(task: () => Promise<MintJobResult>) {
  const state = getState();
  if (state.snapshot.status === 'running' && state.promise) return state.promise;

  const startedAt = Date.now();
  state.snapshot = { status: 'running', startedAt };
  state.promise = (async () => {
    try {
      const result = await task();
      state.snapshot = { status: 'done', startedAt, finishedAt: Date.now(), result };
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      state.snapshot = { status: 'error', startedAt, finishedAt: Date.now(), error: msg };
      throw e;
    } finally {
      emit();
      // Allow re-run after completion
      state.promise = null;
    }
  })();

  emit();
  return state.promise;
}

