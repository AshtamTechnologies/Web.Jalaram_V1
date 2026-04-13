import { useEffect } from 'react';

/**
 * useResizableColumns
 *
 * Attaches drag-to-resize handles to every <th> in the given table ref.
 *
 * @param {React.RefObject} tableRef   - ref attached to the <table> element
 * @param {boolean}         tableReady - set to true once the table is rendered
 * @param {number[]}        initialWidths - optional array of starting column widths (px)
 *
 * Usage:
 *   const tableRef = useRef(null);
 *   const [tableReady, setTableReady] = useState(false);
 *   useEffect(() => { if (!loading) setTableReady(true); }, [loading]);
 *   useResizableColumns(tableRef, tableReady, [140, 200, 110, 100, 70]);
 *
 *   <table ref={tableRef}>…</table>
 */
export function useResizableColumns(tableRef, tableReady, initialWidths = []) {
  useEffect(() => {
    if (!tableReady) return;
    const table = tableRef.current;
    if (!table) return;

    const ths = Array.from(table.querySelectorAll('thead th'));
    const DEFAULT_WIDTH = 120;

    ths.forEach((th, i) => {
      th.style.width    = (initialWidths[i] ?? DEFAULT_WIDTH) + 'px';
      th.style.position = 'relative';
      th.style.overflow = 'visible';
    });

    let startX, startW, activeTh;

    const onMouseMove = (e) => {
      if (!activeTh) return;
      const newW = Math.max(60, startW + (e.clientX - startX));
      activeTh.style.width = newW + 'px';
    };

    const onMouseUp = () => {
      if (activeTh) {
        activeTh.querySelector('.col-resizer')?.classList.remove('resizing');
        activeTh = null;
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };

    ths.forEach((header) => {
      // Remove any stale resizer from a previous render
      header.querySelector('.col-resizer')?.remove();

      const resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      resizer.style.cssText = `
        position: absolute; right: 0; top: 0;
        height: 100%; width: 8px;
        cursor: col-resize; user-select: none; z-index: 10;
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
        activeTh = header;
        startX   = e.clientX;
        startW   = header.offsetWidth;
        line.style.background = '#049edf';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup',   onMouseUp);
      });

      header.appendChild(resizer);
    });

    return () => {
      ths.forEach(header => header.querySelector('.col-resizer')?.remove());
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup',   onMouseUp);
    };
  }, [tableReady]); // re-runs only when the table becomes ready
}