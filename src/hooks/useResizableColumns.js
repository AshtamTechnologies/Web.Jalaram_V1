import { useEffect } from 'react';

export function useResizableColumns(tableRef, tableReady, initialWidths = []) {
  useEffect(() => {
    if (!tableReady) return;
    const table = tableRef.current;
    if (!table) return;

    const ths = Array.from(table.querySelectorAll('thead th'));
    const DEFAULT_WIDTH = 120;

    // Set table to fixed layout so width changes take effect (with important priority to override any stylesheets)
    table.style.setProperty('table-layout', 'fixed', 'important');

    ths.forEach((th, i) => {
      th.style.width    = (initialWidths[i] ?? DEFAULT_WIDTH) + 'px';
      th.style.minWidth = (initialWidths[i] ?? DEFAULT_WIDTH) + 'px';
      th.style.position = 'relative';
      th.style.overflow = 'visible';
      th.style.userSelect = 'none';
    });

    let startX, startW, activeTh, activeLine;

    const startResize = (clientX, header, line) => {
      activeTh   = header;
      activeLine = line;
      startX     = clientX;
      startW     = header.offsetWidth;
      line.style.background         = '#049edf';
      document.body.style.cursor    = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const resizeMove = (clientX) => {
      if (!activeTh) return;
      const newW = Math.max(60, startW + (clientX - startX));
      activeTh.style.width    = newW + 'px';
      activeTh.style.minWidth = newW + 'px';
    };

    const endResize = () => {
      if (activeLine) {
        activeLine.style.background = 'rgba(4,158,223,0.35)';
      }
      activeTh   = null;
      activeLine = null;
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };

    const onMouseMove = (e) => {
      resizeMove(e.clientX);
    };

    const onMouseUp = () => {
      endResize();
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };

    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        resizeMove(e.touches[0].clientX);
      }
    };

    const onTouchEnd = () => {
      endResize();
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };

    ths.forEach((header) => {
      header.querySelector('.col-resizer')?.remove();

      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      resizer.style.cssText = `
        position: absolute; right: -1px; top: 0;
        height: 100%; width: 10px;
        cursor: col-resize; user-select: none; z-index: 20;
        display: flex; align-items: center; justify-content: center;
      `;

      const line = document.createElement('div');
      line.style.cssText = `
        width: 2px; height: 60%;
        background: rgba(4,158,223,0.35);
        border-radius: 2px; pointer-events: none;
        transition: background 0.15s;
      `;
      resizer.appendChild(line);

      resizer.addEventListener('mouseenter', () => {
        line.style.background = '#049edf';
      });
      resizer.addEventListener('mouseleave', () => {
        if (activeTh !== header) line.style.background = 'rgba(4,158,223,0.35)';
      });

      // Mouse Resizing
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        startResize(e.clientX, header, line);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
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
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend',   onTouchEnd);
        document.addEventListener('touchcancel', onTouchEnd);
      });

      header.appendChild(resizer);
    });

    return () => {
      ths.forEach(header => header.querySelector('.col-resizer')?.remove());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };
  }, [tableReady, initialWidths]);
}