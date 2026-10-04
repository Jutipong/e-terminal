// ตรวจ column alignment ของข้อความไทยแบบตัวเลข โดยอ่านพิกเซลจาก canvas ของ xterm
// ทุกบรรทัดที่ชุดทดสอบสร้างมามีจำนวนคอลัมน์ตามที่คาดไว้เท่ากันหมด
// วัดหมุดที่ "ขอมขวาของหมึ่งในบรรทัด" แล้วเทียบกับจำนวนคอลัมน์ที่คำนวณจากข้อความใน buffer
import { launchApp, sleep } from './cdp.mjs';

const TOLERANCE_CELLS = 0.05;

/** ช่วงอักขระไทยที่เป็นสระ/วรรณยุกต์/ทัณฑฆาต จึงไม่กินคอลัมน์เพิ่ม (ตรงกับตารางของ xterm.js) */
const ZERO_WIDTH_RANGES = [
  [0x0e31, 0x0e31],
  [0x0e34, 0x0e3a],
  [0x0e47, 0x0e4e],
];

function expectedColumns(text) {
  let width = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    width += ZERO_WIDTH_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to) ? 0 : 1;
  }
  return width;
}

const app = await launchApp();
await app.waitForPrompt();
await sleep(500);
await app.type('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/thai-test.ps1');
await app.enter();
await sleep(4000);

const raw = await app.evaluate(`(() => {
  const term = window.__terminal;
  if (!term) return JSON.stringify({ error: 'ไม่พบ window.__terminal' });
  const canvas = document.querySelector('.xterm canvas');
  if (!canvas) return JSON.stringify({ error: 'ไม่พบ canvas' });

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cellWidth = (rect.width / term.cols) * scaleX;
  const cellHeight = (rect.height / term.rows) * scaleY;
  const ctx = canvas.getContext('2d');

  const buffer = term.buffer.active;
  const lines = [];
  for (let y = 0; y < buffer.length; y++) {
    const line = buffer.getLine(y);
    if (!line) continue;
    const text = line.translateToString(true).trimEnd();
    if (!text.endsWith('|')) continue;

    const top = Math.round(y * cellHeight);
    const bottom = Math.min(canvas.height, Math.round((y + 1) * cellHeight));
    const image = ctx.getImageData(0, top, canvas.width, Math.max(1, bottom - top)).data;
    let rightMost = -1;
    for (let x = canvas.width - 1; x >= 0; x--) {
      let inked = false;
      for (let py = 0; py < bottom - top; py++) {
        const offset = (py * canvas.width + x) * 4;
        // พื้นหลังธีมคือ #0c0c0c
        if (Math.abs(image[offset] - 12) > 24 || Math.abs(image[offset + 1] - 12) > 24 || Math.abs(image[offset + 2] - 12) > 24) {
          inked = true;
          break;
        }
      }
      if (inked) {
        rightMost = x;
        break;
      }
    }
    lines.push({ text, renderedColumns: rightMost < 0 ? 0 : (rightMost + 1) / cellWidth });
  }
  return JSON.stringify({ cellWidth, cellHeight, lines });
})()`);

const payload = JSON.parse(raw);
if (payload.error) {
  console.error(payload.error);
  await app.close();
  process.exit(1);
}

const { cellWidth, lines } = payload;

// ขอมขวาของหมึ่ง "|" ไม่ได้ชนขอบช่องพอดี ทำให้ทุกบรรทัดคลาดเท่ากันเป็นค่าคงที่
// จึงใช้บรรทัด ASCII ล้วนเป็นจุดอ้างอิงแล้วหักค่าคงที่นั้นออก
const isAsciiOnly = (text) => [...text].every((character) => character.codePointAt(0) < 0x80);
const reference = lines.filter((line) => isAsciiOnly(line.text));
const calibration =
  reference.reduce((sum, line) => sum + (line.renderedColumns - expectedColumns(line.text)), 0) /
  reference.length;

console.log(`cell width = ${cellWidth.toFixed(3)} px (device pixels)`);
console.log(`อ้างอิงจากบรรทัด ASCII ล้วน ${reference.length} บรรทัด (offset ${calibration.toFixed(3)} คอลัมน์)`);
console.log(`ตรวจ ${lines.length} บรรทัด (ยอมให้คลาดเคลื่อน ${TOLERANCE_CELLS} คอลัมน์)\n`);

let worst = 0;
let failed = 0;
for (const line of lines) {
  const expected = expectedColumns(line.text);
  const drift = line.renderedColumns - expected - calibration;
  worst = Math.max(worst, Math.abs(drift));
  const ok = Math.abs(drift) <= TOLERANCE_CELLS;
  if (!ok) {
    failed++;
  }
  console.log(
    `  [${ok ? 'OK   ' : 'DRIFT'}] ${drift >= 0 ? '+' : ''}${drift.toFixed(3)} คอลัมน์  ` +
      `(คาด ${expected})  ${line.text.slice(0, 44)}`,
  );
}

console.log(
  `\nผล: ${failed === 0 ? 'ผ่านทั้งหมด' : `ไม่ผ่าน ${failed}/${lines.length} บรรทัด`} (คลาดเคลื่อนมากที่สุด ${worst.toFixed(3)} คอลัมน์)`,
);
console.log('console errors:', JSON.stringify(app.consoleErrors));

await app.shot('docs/evidence/shell/05-thai-alignment.png');
await app.close();

process.exit(failed === 0 ? 0 : 1);
