// Squarified treemap layout (Bruls, Huizing & van Wijk, 2000). Pure and
// deterministic so the server can lay tiles out without a charting dependency.

export interface TreemapItem {
  id: string;
  value: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreemapTile extends Rect {
  id: string;
  value: number;
}

/** Worst aspect ratio in a row of areas laid along a side of length `side`. */
function worst(areas: readonly number[], side: number): number {
  if (!areas.length || side <= 0) return Number.POSITIVE_INFINITY;
  const s = areas.reduce((a, b) => a + b, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  const side2 = side * side;
  return Math.max((side2 * max) / (s * s), (s * s) / (side2 * min));
}

/**
 * Lays items out inside `rect` with tile area proportional to `value`.
 * Items with a non-positive or non-finite value are dropped. Output is in
 * descending value order (ties keep input order).
 */
export function squarify(items: readonly TreemapItem[], rect: Rect): TreemapTile[] {
  const sorted = items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.item.value - a.item.value || a.i - b.i)
    .map(({ item }) => item);
  const total = sorted.reduce((a, b) => a + b.value, 0);
  if (!sorted.length || rect.w <= 0 || rect.h <= 0 || total <= 0) return [];
  const scale = (rect.w * rect.h) / total;
  const areas = sorted.map(s => s.value * scale);

  const out: TreemapTile[] = [];
  let free: Rect = { ...rect };
  let row: number[] = [];
  let rowStart = 0;

  const flush = (last: boolean) => {
    const s = row.reduce((a, b) => a + b, 0);
    if (free.w >= free.h) {
      // Column on the left, tiles stacked top to bottom.
      const width = last ? free.w : s / free.h;
      let y = free.y;
      row.forEach((a, k) => {
        const h = k === row.length - 1 ? free.y + free.h - y : a / width;
        out.push({ id: sorted[rowStart + k].id, value: sorted[rowStart + k].value, x: free.x, y, w: width, h });
        y += h;
      });
      free = { x: free.x + width, y: free.y, w: Math.max(0, free.w - width), h: free.h };
    } else {
      // Row along the top, tiles left to right.
      const height = last ? free.h : s / free.w;
      let x = free.x;
      row.forEach((a, k) => {
        const w = k === row.length - 1 ? free.x + free.w - x : a / height;
        out.push({ id: sorted[rowStart + k].id, value: sorted[rowStart + k].value, x, y: free.y, w, h: height });
        x += w;
      });
      free = { x: free.x, y: free.y + height, w: free.w, h: Math.max(0, free.h - height) };
    }
    rowStart += row.length;
    row = [];
  };

  for (let i = 0; i < areas.length; i++) {
    const side = Math.min(free.w, free.h);
    const a = areas[i];
    if (row.length === 0 || worst([...row, a], side) <= worst(row, side)) {
      row.push(a);
    } else {
      flush(false);
      row.push(a);
    }
  }
  if (row.length) flush(true);
  return out;
}
