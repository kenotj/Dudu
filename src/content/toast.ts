let toastEl: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, ms = 1800): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'dudu-toast';
  }
  toastEl.textContent = message;
  if (!toastEl.isConnected) document.documentElement.appendChild(toastEl);
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toastEl?.remove();
  }, ms);
}
