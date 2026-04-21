export class IntersectionGate {
  private observer: IntersectionObserver | null = null;
  private pending = new Map<Element, () => void>();

  constructor(private rootMargin = '100px') {
    if (typeof IntersectionObserver !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const cb = this.pending.get(entry.target);
              if (cb) {
                this.pending.delete(entry.target);
                this.observer?.unobserve(entry.target);
                cb();
              }
            }
          }
        },
        { rootMargin: this.rootMargin },
      );
    }
  }

  whenVisible(el: Element, cb: () => void): void {
    if (!this.observer) {
      cb();
      return;
    }
    const rect = (el as HTMLElement).getBoundingClientRect?.();
    if (rect && rect.top < window.innerHeight + 100 && rect.bottom > -100) {
      cb();
      return;
    }
    this.pending.set(el, cb);
    this.observer.observe(el);
  }

  cancel(el: Element): void {
    if (this.pending.has(el)) {
      this.pending.delete(el);
      this.observer?.unobserve(el);
    }
  }

  dispose(): void {
    this.observer?.disconnect();
    this.pending.clear();
  }
}
