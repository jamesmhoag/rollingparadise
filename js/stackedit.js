// One rule for changing a stack by hand, wherever a stack is painted (your Stake before a bout, a Roller's or an
// opponent's position in Build mode, any space at the test table). A stack is a list, bottom chip first.
//   add     the chip goes on top
//   insert  the chip goes in just below the chip pointed at (below the whole stack when none is)
//   change  the chip pointed at becomes the chip (the top one when none is)
//   remove  the chip pointed at comes out (the top one when none is)
// at: the index of the chip pointed at, or -1; top: the index Change and Remove fall back to (the last, unless the
// caller says otherwise). → { i, old } (where it happened, and the chip that left), or null when there was nothing to do.
export const PAINT_OPS = ['add', 'insert', 'change', 'remove'];
export const ADDS = (op) => op === 'add' || op === 'insert'; // the ops that make a stack taller
export function stackEdit(list, op, item, at = -1, top = list.length - 1) {
  if (op === 'add') { list.push(item); return { i: list.length - 1, old: null }; }
  if (op === 'insert') { const i = at >= 0 ? Math.min(at, list.length) : 0; list.splice(i, 0, item); return { i, old: null }; }
  const i = at >= 0 && at < list.length ? at : top; if (i < 0 || i >= list.length) return null;
  if (op === 'change') { const old = list[i]; list[i] = item; return { i, old }; }
  if (op === 'remove') return { i, old: list.splice(i, 1)[0] };
  return null;
}
