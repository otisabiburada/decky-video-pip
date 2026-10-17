// Minimal QR code encoder (byte mode, error correction L or M, versions 1-10).
// Algorithm follows the QR Code model 2 spec; structure inspired by Project Nayuki's
// MIT-licensed reference implementation. No dependencies.

export type QrEcc = "L" | "M";

const ECC_PER_BLOCK: Record<QrEcc, number[]> = {
  L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18],
  M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26],
};
const NUM_BLOCKS: Record<QrEcc, number[]> = {
  L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4],
  M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5],
};
const FORMAT_BITS: Record<QrEcc, number> = { L: 1, M: 0 };
// Only short URLs are ever encoded (about 40 characters, version 3-4). Capped at the versions that were
// verified by decoding every mask with an independent reader.
const MAX_VERSION = 6;

function rawModules(ver: number): number {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}

function dataCodewords(ver: number, ecc: QrEcc): number {
  return Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ecc][ver] * NUM_BLOCKS[ecc][ver];
}

function gfMul(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < degree - 1; i++) result.push(0);
  result.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < result.length; j++) {
      result[j] = gfMul(result[j], root);
      if (j + 1 < result.length) result[j] ^= result[j + 1];
    }
    root = gfMul(root, 0x02);
  }
  return result;
}

function rsRemainder(data: number[], divisor: number[]): number[] {
  const result = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] ^= gfMul(coef, factor);
    });
  }
  return result;
}

function utf8(text: string): number[] {
  const out: number[] = [];
  for (const ch of unescape(encodeURIComponent(text))) out.push(ch.charCodeAt(0));
  return out;
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}

export interface QrCode {
  size: number;
  version: number;
  mask: number;
  modules: boolean[][];
}

export function encodeQr(text: string, ecc: QrEcc = "M", forceMask?: number): QrCode {
  const bytes = utf8(text);
  // choose the smallest version that fits
  let ver = 1;
  for (; ver <= MAX_VERSION; ver++) {
    const capBits = dataCodewords(ver, ecc) * 8;
    const used = 4 + (ver < 10 ? 8 : 16) + bytes.length * 8;
    if (used <= capBits) break;
  }
  if (ver > MAX_VERSION) throw new Error("Text too long for QR code");

  // ---- data bits
  const bits: number[] = [];
  const push = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
  };
  push(0x4, 4);
  push(bytes.length, ver < 10 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const capBits = dataCodewords(ver, ecc) * 8;
  push(0, Math.min(4, capBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < capBits; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    data.push(v);
  }

  // ---- error correction + interleave
  const nBlocks = NUM_BLOCKS[ecc][ver];
  const blockEcc = ECC_PER_BLOCK[ecc][ver];
  const rawCw = Math.floor(rawModules(ver) / 8);
  const nShort = nBlocks - (rawCw % nBlocks);
  const shortLen = Math.floor(rawCw / nBlocks);
  const blocks: number[][] = [];
  const div = rsDivisor(blockEcc);
  for (let i = 0, k = 0; i < nBlocks; i++) {
    const dat = data.slice(k, k + shortLen - blockEcc + (i < nShort ? 0 : 1));
    k += dat.length;
    const e = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(e));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0].length; i++) {
    blocks.forEach((blk, j) => {
      if (i !== shortLen - blockEcc || j >= nShort) all.push(blk[i]);
    });
  }

  // ---- matrix
  const size = ver * 4 + 17;
  const modules: boolean[][] = [];
  const isFn: boolean[][] = [];
  for (let i = 0; i < size; i++) {
    modules.push(new Array(size).fill(false));
    isFn.push(new Array(size).fill(false));
  }
  const setFn = (x: number, y: number, dark: boolean) => {
    modules[y][x] = dark;
    isFn[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    setFn(6, i, i % 2 === 0);
    setFn(i, 6, i % 2 === 0);
  }
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < size && y >= 0 && y < size) setFn(x, y, dist !== 2 && dist !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  const alignPos: number[] = [];
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2;
    const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
    alignPos.push(6);
    for (let pos = size - 7; alignPos.length < n; pos -= step) alignPos.splice(1, 0, pos);
  }
  const nA = alignPos.length;
  for (let i = 0; i < nA; i++) {
    for (let j = 0; j < nA; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === nA - 1) || (i === nA - 1 && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          setFn(alignPos[i] + dx, alignPos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
        }
      }
    }
  }

  const drawFormat = (mask: number) => {
    const d = (FORMAT_BITS[ecc] << 3) | mask;
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const fb = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) setFn(8, i, getBit(fb, i));
    setFn(8, 7, getBit(fb, 6));
    setFn(8, 8, getBit(fb, 7));
    setFn(7, 8, getBit(fb, 8));
    for (let i = 9; i < 15; i++) setFn(14 - i, 8, getBit(fb, i));
    for (let i = 0; i < 8; i++) setFn(size - 1 - i, 8, getBit(fb, i));
    for (let i = 8; i < 15; i++) setFn(8, size - 15 + i, getBit(fb, i));
    setFn(8, size - 8, true);
  };
  drawFormat(0);

  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const vb = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFn(a, b, getBit(vb, i));
      setFn(b, a, getBit(vb, i));
    }
  }

  // codewords in zigzag
  let bi = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!isFn[y][x] && bi < all.length * 8) {
          modules[y][x] = getBit(all[bi >>> 3], 7 - (bi & 7));
          bi++;
        }
      }
    }
  }

  const applyMask = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let inv = false;
        switch (mask) {
          case 0: inv = (x + y) % 2 === 0; break;
          case 1: inv = y % 2 === 0; break;
          case 2: inv = x % 3 === 0; break;
          case 3: inv = (x + y) % 3 === 0; break;
          case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: inv = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: inv = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: inv = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        }
        if (!isFn[y][x] && inv) modules[y][x] = !modules[y][x];
      }
    }
  };

  const penalty = (): number => {
    let score = 0;
    const line = (get: (i: number) => boolean) => {
      let run = 1;
      for (let i = 1; i < size; i++) {
        if (get(i) === get(i - 1)) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score += 1;
        } else run = 1;
      }
      // finder-like pattern 1011101 with 4 light modules on a side
      const pat = [true, false, true, true, true, false, true];
      for (let i = 0; i + 7 <= size; i++) {
        let m = true;
        for (let k = 0; k < 7 && m; k++) if (get(i + k) !== pat[k]) m = false;
        if (!m) continue;
        const lightBefore = i >= 4 && [1, 2, 3, 4].every((k) => !get(i - k));
        const lightAfter = i + 11 <= size && [7, 8, 9, 10].every((k) => !get(i + k));
        if (lightBefore || lightAfter) score += 40;
      }
    };
    for (let y = 0; y < size; y++) line((i) => modules[y][i]);
    for (let x = 0; x < size; x++) line((i) => modules[i][x]);
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = modules[y][x];
        if (c === modules[y][x + 1] && c === modules[y + 1][x] && c === modules[y + 1][x + 1]) score += 3;
      }
    }
    let dark = 0;
    for (const row of modules) for (const c of row) if (c) dark++;
    const total = size * size;
    score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
    return score;
  };

  let best = 0;
  let bestScore = Infinity;
  for (let m = 0; m < 8; m++) {
    if (forceMask !== undefined && m !== forceMask) continue;
    applyMask(m);
    drawFormat(m);
    const p = penalty();
    if (p < bestScore) {
      bestScore = p;
      best = m;
    }
    applyMask(m); // undo
  }
  applyMask(best);
  drawFormat(best);
  return { size, version: ver, mask: best, modules };
}

/** One SVG path string covering all dark modules (with a 4 module quiet zone via the viewBox). */
export function qrPath(qr: QrCode): { path: string; viewBox: string } {
  const parts: string[] = [];
  for (let y = 0; y < qr.size; y++) {
    let x = 0;
    while (x < qr.size) {
      if (!qr.modules[y][x]) { x++; continue; }
      let run = 1;
      while (x + run < qr.size && qr.modules[y][x + run]) run++;
      parts.push("M" + (x + 4) + " " + (y + 4) + "h" + run + "v1h-" + run + "z");
      x += run;
    }
  }
  const total = qr.size + 8;
  return { path: parts.join(""), viewBox: "0 0 " + total + " " + total };
}
