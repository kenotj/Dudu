import { MUTATION_DEBOUNCE_MS } from '@/shared/constants';

export class MutationWatcher {
  private observer: MutationObserver | null = null;
  private queue = new Set<Element>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private onBatch: (roots: Element[]) => void) {}

  start(root: Node = document.body): void {
    if (!root || this.observer) return;
    this.observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (n.nodeType === Node.ELEMENT_NODE) this.queue.add(n as Element);
          });
        } else if (m.type === 'characterData' && m.target.parentElement) {
          this.queue.add(m.target.parentElement);
        }
      }
      this.schedule();
    });
    this.observer.observe(root, { childList: true, subtree: true, characterData: true });
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      const batch = Array.from(this.queue);
      this.queue.clear();
      if (batch.length > 0) this.onBatch(batch);
    }, MUTATION_DEBOUNCE_MS);
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue.clear();
  }
}
