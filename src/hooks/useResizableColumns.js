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

    const onMouseMove = (e) => {
      if (!activeTh) return;
      const newW = Math.max(60, startW + (e.clientX - startX));
      activeTh.style.width    = newW + 'px';
      activeTh.style.minWidth = newW + 'px';
    };

    const onMouseUp = () => {
      if (activeLine) {
        activeLine.style.background = 'rgba(4,158,223,0.35)';
      }
      activeTh   = null;
      activeLine = null;
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
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
      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        activeTh   = header;
        activeLine = line;
        startX     = e.clientX;
        startW     = header.offsetWidth;
        line.style.background         = '#049edf';
        document.body.style.cursor    = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
      });

      header.appendChild(resizer);
    });

    return () => {
      ths.forEach(header => header.querySelector('.col-resizer')?.remove());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };
  }, [tableReady]);
}