// Generates placeholder PNG files for sign-image-1.png and sign-image-2.png
// Run once to create the assets. Replace the output files with your real images.
import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// CRC-32 table
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(width, height, fillFn) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // RGB color
  // compression, filter, interlace = 0

  // Raw scanlines: 1 filter byte + 3 bytes per pixel
  const raw = Buffer.alloc((1 + width * 3) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fillFn(x, y, width, height);
      const off = y * (1 + width * 3) + 1 + x * 3;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
    }
  }

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

// Sign 1 placeholder: dark navy with white text area (portrait 3:4)
const W1 = 300, H1 = 400;
const png1 = makePNG(W1, H1, (x, y, w, h) => {
  const margin = 20;
  if (x < margin || x >= w - margin || y < margin || y >= h - margin) return [30, 50, 100];
  // white inner area
  return [240, 240, 240];
});
writeFileSync(resolve(__dirname, '../public/sign-image-1.png'), png1);
console.log('Written public/sign-image-1.png (%dx%d placeholder)', W1, H1);

// Sign 2 placeholder: dark olive with white text area (square-ish)
const W2 = 400, H2 = 400;
const png2 = makePNG(W2, H2, (x, y, w, h) => {
  const margin = 20;
  if (x < margin || x >= w - margin || y < margin || y >= h - margin) return [50, 70, 30];
  return [240, 240, 240];
});
writeFileSync(resolve(__dirname, '../public/sign-image-2.png'), png2);
console.log('Written public/sign-image-2.png (%dx%d placeholder)', W2, H2);
