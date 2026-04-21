export interface CueLine {
  original: string;
  translation?: string;
}

export interface SubtitleOverlay {
  render(cues: CueLine[]): void;
  dispose(): void;
}

export function createOverlay(video: HTMLVideoElement): SubtitleOverlay {
  const container = document.createElement('div');
  container.className = 'dudu-subtitle-overlay';
  Object.assign(container.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    bottom: '12%',
    textAlign: 'center',
    pointerEvents: 'none',
    zIndex: '2147483646',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textShadow: '0 1px 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.8)',
    color: '#fff',
    padding: '4px 8px',
    transition: 'opacity 120ms',
  } as Partial<CSSStyleDeclaration>);

  const mount = () => {
    const parent = video.parentElement;
    if (!parent) return;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    if (container.parentElement !== parent) parent.appendChild(container);
  };
  mount();

  const resizeObserver = new ResizeObserver(() => mount());
  resizeObserver.observe(video);

  return {
    render(cues) {
      container.innerHTML = '';
      for (const cue of cues) {
        if (cue.original) {
          const row = document.createElement('div');
          row.style.fontSize = '18px';
          row.style.opacity = '0.9';
          row.textContent = cue.original;
          container.appendChild(row);
        }
        if (cue.translation) {
          const row = document.createElement('div');
          row.style.fontSize = '22px';
          row.style.fontWeight = '600';
          row.style.marginTop = '2px';
          row.textContent = cue.translation;
          container.appendChild(row);
        }
      }
    },
    dispose() {
      resizeObserver.disconnect();
      container.remove();
    },
  };
}
