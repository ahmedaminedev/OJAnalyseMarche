import { processWorkerAction } from '../workers/importWorker';

class WorkerClient {
  private worker: Worker | null = null;
  private pendingCallbacks = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private messageCounter = 0;
  private isWorkerSupported = typeof window !== 'undefined' && typeof window.Worker !== 'undefined';

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (!this.isWorkerSupported) return;

    try {
      this.worker = new Worker(new URL('../workers/importWorker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const { id, success, result, error } = e.data;
        const cb = this.pendingCallbacks.get(id);
        if (cb) {
          this.pendingCallbacks.delete(id);
          if (success) {
            cb.resolve(result);
          } else {
            cb.reject(new Error(error));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.warn('Erreur Web Worker, basculement en mode thread principal:', err);
        this.worker = null;
      };
    } catch (err) {
      console.warn('Impossible de créer le Web Worker, utilisation du thread principal:', err);
      this.worker = null;
    }
  }

  async runTask<T>(action: string, payload: any): Promise<T> {
    if (this.worker) {
      const id = `msg_${++this.messageCounter}_${Date.now()}`;
      return new Promise<T>((resolve, reject) => {
        this.pendingCallbacks.set(id, { resolve, reject });
        this.worker!.postMessage({ id, action, payload });
      });
    }

    // Direct synchronous / microtask fallback
    return new Promise<T>((resolve, reject) => {
      try {
        const res = processWorkerAction(action, payload);
        resolve(res as T);
      } catch (err) {
        reject(err);
      }
    });
  }
}

export const workerClient = new WorkerClient();
