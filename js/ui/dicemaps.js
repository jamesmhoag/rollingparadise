// A die's face maps, shaded: from the engraved height map (H, softened) and its sharp twin, every pixel of the die's
// maps (dice3d.js faceMaps): the relief as a normal map, the colour (ink in the recess, a darker rim, bone's grain),
// the roughness, and for a see-through die the paint in its recess and the light let through. It is plain arithmetic
// over a million pixels, with nothing of the page in it, so it runs here on the page (a die made on demand) or in a
// worker (dicemaps.worker.js: dice made ready ahead of need, while the title is up) alike.
// H, sharp: RGBA bytes, S x S. look: { flakes, frost, grain, paint }. b, ink: [r, g, b] (ink may be null).
// Returns { N, C, Rg, Pt, Tr }: RGBA bytes each (Pt and Tr only for a painted look).
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export function shade(H, sharp, S, look, b, ink) {
  // glitter: a field of tiny flakes, each tilted its own way
  const flake = new Float32Array(S * S * 2);
  if (look.flakes) { let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let n = 0; n < S * S * 0.06 * look.flakes; n++) { const x = (rnd() * S) | 0, y = (rnd() * S) | 0, ax = (rnd() - 0.5) * 1.6, ay = (rnd() - 0.5) * 1.6, sz = 1 + ((rnd() * 2) | 0);
      for (let j = 0; j < sz; j++) for (let i2 = 0; i2 < sz; i2++) { const p = ((y + j) % S) * S + ((x + i2) % S); flake[p * 2] = ax; flake[p * 2 + 1] = ay; } } }
  const bytes = () => new Uint8ClampedArray(S * S * 4);
  const N = bytes(), C = bytes(), Rg = bytes(), Pt = look.paint ? bytes() : null, Tr = look.paint ? bytes() : null, strength = 3.2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, h = (xx, yy) => H[(Math.min(S - 1, Math.max(0, yy)) * S + Math.min(S - 1, Math.max(0, xx))) * 4] / 255;
    let dx = (h(x + 1, y) - h(x - 1, y)) * strength, dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    dx += flake[i * 2]; dy += flake[i * 2 + 1];
    const l = Math.hypot(dx, dy, 1); N[i * 4] = ((-dx / l) * 0.5 + 0.5) * 255; N[i * 4 + 1] = ((dy / l) * 0.5 + 0.5) * 255; N[i * 4 + 2] = ((1 / l) * 0.5 + 0.5) * 255; N[i * 4 + 3] = 255;
    const depth = 1 - H[i * 4] / 255, inside = 1 - sharp[i * 4] / 255; // 0 on the face, 1 at the bottom of the recess
    let col = b; if (ink && inside > 0.02) col = mix3(b, ink, Math.min(1, inside * 1.2)); col = mix3(col, [0, 0, 0], depth * 0.18 * (1 - inside)); // the rim of the recess darkens a touch
    if (look.grain) { const gr = (Math.sin(x * 0.07 + Math.sin(y * 0.011) * 9) * 0.5 + 0.5) * 0.06; col = mix3(col, [120, 90, 50], gr); }
    C[i * 4] = col[0]; C[i * 4 + 1] = col[1]; C[i * 4 + 2] = col[2]; C[i * 4 + 3] = 255;
    const rough = look.frost ? 0.08 + inside * 0.7 : 0.3 + inside * 0.3; Rg[i * 4 + 1] = rough * 255; Rg[i * 4] = Rg[i * 4 + 2] = 0; Rg[i * 4 + 3] = 255;
    if (Pt) { const on = Math.min(1, inside * 1.6) * 255; Pt[i * 4] = Pt[i * 4 + 1] = Pt[i * 4 + 2] = on; Pt[i * 4 + 3] = 255;
      Tr[i * 4] = Tr[i * 4 + 1] = Tr[i * 4 + 2] = 255 - on; Tr[i * 4 + 3] = 255; }
  }
  return { N, C, Rg, Pt, Tr };
}
