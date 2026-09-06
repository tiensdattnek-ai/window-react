import { useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import type { WindowState } from '../lib/types';
import { useWorkspace } from '../context/WorkspaceContext';
import { AppIcon } from './AppIcon';
import { clamp } from '../lib/utils';

export function AppWindow({ window: win, children }: { window: WindowState; children: ReactNode }) {
  const { activeApp, focusApp, closeApp, minimizeApp, maximizeApp, patchWindow } = useWorkspace();
  const [snap, setSnap] = useState<'left' | 'right' | 'full' | null>(null);
  function drag(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input')) return;
    e.preventDefault();
    const x = e.clientX;
    const y = e.clientY;
    let startX = win.x;
    let startY = win.y;
    if (win.maximized) {
      startX = clamp(x - win.width / 2, 0, innerWidth - win.width);
      startY = 8;
      patchWindow(win.id, { maximized: false, x: startX, y: startY });
    }
    document.body.classList.add('is-dragging');
    let target: 'left' | 'right' | 'full' | null = null;
    function move(event: globalThis.PointerEvent) {
      patchWindow(win.id, {
        x: clamp(startX + event.clientX - x, -win.width + 140, innerWidth - 140),
        y: clamp(startY + event.clientY - y, 0, innerHeight - 130),
      });
      target =
        event.clientY < 10
          ? 'full'
          : event.clientX < 14
            ? 'left'
            : event.clientX > innerWidth - 14
              ? 'right'
              : null;
      setSnap(target);
    }
    function end() {
      document.body.classList.remove('is-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      setSnap(null);
      if (target === 'full') patchWindow(win.id, { maximized: true });
      else if (target)
        patchWindow(win.id, {
          x: target === 'left' ? 8 : innerWidth / 2 + 4,
          y: 8,
          width: innerWidth / 2 - 12,
          height: innerHeight - 92,
          maximized: false,
        });
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end, { once: true });
  }
  function resize(e: PointerEvent<HTMLDivElement>, direction: string) {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    focusApp(win.id);
    const startX = e.clientX;
    const startY = e.clientY;
    document.body.classList.add('is-dragging');
    const minWidth = win.id === 'calculator' ? 310 : Math.min(530, innerWidth - 16);
    const minHeight = 340;
    function move(event: globalThis.PointerEvent) {
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const patch: Partial<WindowState> = {};
      if (direction.includes('e'))
        patch.width = clamp(win.width + dx, minWidth, innerWidth - win.x - 8);
      if (direction.includes('s'))
        patch.height = clamp(win.height + dy, minHeight, innerHeight - win.y - 82);
      if (direction.includes('w')) {
        patch.width = clamp(win.width - dx, minWidth, win.x + win.width - 8);
        patch.x = win.x + win.width - patch.width;
      }
      if (direction.includes('n')) {
        patch.height = clamp(win.height - dy, minHeight, win.y + win.height - 8);
        patch.y = win.y + win.height - patch.height;
      }
      patchWindow(win.id, patch);
    }
    function end() {
      document.body.classList.remove('is-dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end, { once: true });
  }
  const style = win.maximized
    ? {
        left: 8,
        top: 8,
        width: 'calc(100vw - 16px)',
        height: 'calc(100dvh - 92px)',
        zIndex: 20 + win.z,
      }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: 20 + win.z };
  return (
    <>
      {snap && <div className={`snap-preview snap-${snap}`} style={{ zIndex: 19 + win.z }} />}
      <section
        className={`app-window window-${win.id} ${activeApp === win.id ? 'is-active' : ''} ${win.maximized ? 'is-maximized' : ''} ${win.minimized ? 'is-minimized' : ''}`}
        style={style}
        aria-label={`${win.title} window`}
        onPointerDown={() => {
          if (activeApp !== win.id) focusApp(win.id);
        }}
      >
        <div
          className="window-titlebar"
          onPointerDown={drag}
          onDoubleClick={(e) => {
            if (!(e.target as HTMLElement).closest('button')) maximizeApp(win.id);
          }}
        >
          <div className="window-title">
            <AppIcon app={win.id} size={20} />
            <span>{win.title}</span>
          </div>
          <span className="window-brand">window react</span>
          <div className="window-controls">
            <button
              aria-label={`Minimize ${win.title}`}
              title="Minimize"
              onClick={() => minimizeApp(win.id)}
            >
              <Minus size={15} />
            </button>
            <button
              aria-label={`Maximize ${win.title}`}
              title={win.maximized ? 'Restore down' : 'Maximize'}
              onClick={() => maximizeApp(win.id)}
            >
              {win.maximized ? <Copy size={12} /> : <Square size={12} />}
            </button>
            <button
              className="close-control"
              aria-label={`Close ${win.title}`}
              title="Close"
              onClick={() => closeApp(win.id)}
            >
              <X size={17} />
            </button>
          </div>
        </div>
        <div className="window-content">{children}</div>
        {!win.maximized &&
          ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].map((direction) => (
            <div
              key={direction}
              className={`resize-handle resize-${direction}`}
              onPointerDown={(e) => resize(e, direction)}
            />
          ))}
      </section>
    </>
  );
}
