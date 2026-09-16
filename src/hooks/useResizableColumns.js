import { useEffect, useMemo } from 'react';

export function useResizableColumns(tableRef, tableReady, initialWidths = []) {
  const widthsKey = useMemo(() => JSON.stringify(initialWidths || []), [initialWidths]);

  useEffect(() => {
    if (!tableReady) return;
    const table = tableRef.current;
    if (!table) return;

    const ths = Array.from(table.querySelectorAll('thead th'));
    if (ths.length === 0) return;

    const DEFAULT_WIDTH = 120;
    const parsedInitialWidths = (() => {
      try {
        return JSON.parse(widthsKey);
      } catch {
        return [];
      }
    })();

    // Set fixed table layout
    table.style.setProperty('table-layout', 'fixed', 'important');

    // Function to calculate and update total table minimum width
    const syncTableWidth = () => {
      const totalWidth = ths.reduce((sum, th) => {
        const w = parseFloat(th.style.width) || th.offsetWidth || DEFAULT_WIDTH;
        return sum + w;
      }, 0);
      table.style.minWidth = `${Math.max(totalWidth, 100)}px`;
    };

    // Initialize column widths
    ths.forEach((th, i) => {
      const initW = parsedInitialWidths[i] ?? DEFAULT_WIDTH;
      th.style.width = `${initW}px`;
      th.style.minWidth = `${initW}px`;
      th.style.position = 'relative';
      th.style.overflow = 'visible';
      th.style.userSelect = 'none';
      th.style.boxSizing = 'border-box';
    });

    syncTableWidth();

    let startX = 0;
    let startW = 0;
    let activeTh = null;
    let activeLine = null;
    let rafId = null;
    let pendingWidth = null;

    const applyWidth = () => {
      if (activeTh && pendingWidth !== null) {
        activeTh.style.width = `${pendingWidth}px`;
        activeTh.style.minWidth = `${pendingWidth}px`;
        syncTableWidth();
      }
      rafId = null;
    };

    const startResize = (clientX, header, line) => {
      activeTh = header;
      activeLine = line;
      startX = clientX;
      startW = header.offsetWidth;
      pendingWidth = startW;

      if (line) {
        line.style.background = '#049edf';
        line.style.height = '100%';
        line.style.boxShadow = '0 0 8px rgba(4,158,223,0.6)';
      }
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const resizeMove = (clientX) => {
      if (!activeTh) return;
      const deltaX = clientX - startX;
      const newW = Math.max(50, startW + deltaX);
      pendingWidth = newW;

      if (!rafId) {
        rafId = requestAnimationFrame(applyWidth);
      }
    };

    const endResize = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        applyWidth();
        rafId = null;
      }
      if (activeLine) {
        activeLine.style.background = 'rgba(4,158,223,0.35)';
        activeLine.style.height = '60%';
        activeLine.style.boxShadow = 'none';
      }
      activeTh = null;
      activeLine = null;
      pendingWidth = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const onMouseMove = (e) => {
      resizeMove(e.clientX);
    };

    const onMouseUp = () => {
      endResize();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        resizeMove(e.touches[0].clientX);
      }
    };

    const onTouchEnd = () => {
      endResize();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };

    // Attach resize handles to headers
    ths.forEach((header) => {
      header.querySelector('.col-resizer')?.remove();

      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      resizer.style.cssText = `
        position: absolute; right: -4px; top: 0;
        height: 100%; width: 12px;
        cursor: col-resize; user-select: none; z-index: 25;
        display: flex; align-items: center; justify-content: center;
        touch-action: none;
      `;

      const line = document.createElement('div');
      line.style.cssText = `
        width: 2.5px; height: 60%;
        background: rgba(4,158,223,0.35);
        border-radius: 2px; pointer-events: none;
        transition: background 0.15s, height 0.15s, box-shadow 0.15s;
      `;
      resizer.appendChild(line);

      resizer.addEventListener('mouseenter', () => {
        if (!activeTh) {
          line.style.background = '#049edf';
          line.style.height = '80%';
        }
      });
      resizer.addEventListener('mouseleave', () => {
        if (activeTh !== header) {
          line.style.background = 'rgba(4,158,223,0.35)';
          line.style.height = '60%';
        }
      });

      // Mouse Resizing
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startResize(e.clientX, header, line);
        document.addEventListener('mousemove', onMouseMove, { passive: true });
        document.addEventListener('mouseup', onMouseUp);
      });

      // Touch Resizing
      resizer.addEventListener('touchstart', (e) => {
        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
        if (e.touches.length > 0) {
          startResize(e.touches[0].clientX, header, line);
        }
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
      });

      header.appendChild(resizer);
    });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      ths.forEach(header => header.querySelector('.col-resizer')?.remove());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [tableReady, widthsKey]);
}