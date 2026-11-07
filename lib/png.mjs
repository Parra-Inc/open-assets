import { inflateSync } from "zlib";

/**
 * Minimal PNG decoder for pixel comparison. Handles what Chromium writes:
 * 8-bit greyscale, grey+alpha, RGB and RGBA, non-interlaced. Returns null
 * for anything else (palette, 16-bit, interlaced, corrupt), which callers
 * treat as "cannot prove the pixels are equal".
 *
 * @param {Buffer} buf
 * @returns {{ width: number, height: number, rgba: Buffer } | null}
 */
export function decodePng(buf) {
  try {
    if (buf.length < 8 || buf.readUInt32BE(0) !== 0x89504e47 || buf.readUInt32BE(4) !== 0x0d0a1a0a) return null;
    let off = 8;
    let width, height, bitDepth, colorType, interlace;
    const idat = [];
    while (off + 8 <= buf.length) {
      const len = buf.readUInt32BE(off);
      const type = buf.toString("latin1", off + 4, off + 8);
      const data = buf.subarray(off + 8, off + 8 + len);
      if (type === "IHDR") {
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        bitDepth = data[8];
        colorType = data[9];
        interlace = data[12];
      } else if (type === "IDAT") {
        idat.push(data);
      } else if (type === "IEND") {
        break;
      }
      off += 12 + len;
    }
    const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
    if (!width || !height || bitDepth !== 8 || !channels || interlace !== 0) return null;

    const raw = inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    if (raw.length < (stride + 1) * height) return null;
    const px = Buffer.alloc(stride * height);
    for (let y = 0; y < height; y++) {
      const filter = raw[y * (stride + 1)];
      const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
      const out = y * stride;
      const prev = y * stride - stride;
      for (let x = 0; x < stride; x++) {
        const a = x >= channels ? px[out + x - channels] : 0;
        const b = y > 0 ? px[prev + x] : 0;
        const c = y > 0 && x >= channels ? px[prev + x - channels] : 0;
        let v = line[x];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += (a + b) >> 1;
        else if (filter === 4) {
          const p = a + b - c;
          const pa = Math.abs(p - a);
          const pb = Math.abs(p - b);
          const pc = Math.abs(p - c);
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        } else if (filter !== 0) return null;
        px[out + x] = v & 0xff;
      }
    }

    if (channels === 4) return { width, height, rgba: px };
    const rgba = Buffer.alloc(width * height * 4);
    for (let i = 0, j = 0; i < px.length; i += channels, j += 4) {
      if (channels === 3) {
        rgba[j] = px[i];
        rgba[j + 1] = px[i + 1];
        rgba[j + 2] = px[i + 2];
        rgba[j + 3] = 255;
      } else {
        rgba[j] = rgba[j + 1] = rgba[j + 2] = px[i];
        rgba[j + 3] = channels === 2 ? px[i + 1] : 255;
      }
    }
    return { width, height, rgba };
  } catch {
    return null;
  }
}

/**
 * True when two PNGs decode to identical pixels, whatever their encoding
 * (compression level, filters, RGB vs RGBA with opaque alpha).
 */
export function samePngPixels(a, b) {
  if (a.equals(b)) return true;
  const x = decodePng(a);
  const y = decodePng(b);
  if (!x || !y || x.width !== y.width || x.height !== y.height) return false;
  return x.rgba.equals(y.rgba);
}
