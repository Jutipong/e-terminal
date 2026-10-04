// ตรวจ column alignment ของข้อความไทยแบบตัวเลข โดยเทียบตำแหน่งที่ DOM renderer วางจริง
// กับจำนวนคอลัมน์ที่คำนวณจากข้อความใน buffer
//
// xterm 6 ไม่มี canvas renderer แล้ว จึงไม่อ่านพิกเซลจาก canvas ได้
// วิธีวัดแทนคือวัดขอบขวาของ span ตัวสุดท้ายในแต่ละแถว ซึ่งคือระยะที่ browser เดินไปจริง
// ถ้า xterm คิด letter-spacing ผิด ขอบขวาจะไม่ตรงกับจำนวนคอลัมน์ที่ควรเป็น
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

// ถ่ายภาพก่อน เพราะตอนที่หน้าต่างไม่ได้โฟกัส Chromium จะหยุดเรียก requestAnimationFrame
// แถวใน DOM จึงยังไม่ถูกวาดจนกว่าจะมีการ capture เฟรมสักครั้ง
await app.shot('docs/evidence/shell/05-thai-alignment.png');

const raw = await app.evaluate(`(() => {
  const term = window.__terminal;
  if (!term) return JSON.stringify({ error: 'ไม่พบ window.__terminal' });
  const rowsElement = document.querySelector('.xterm-rows');
  if (!rowsElement) return JSON.stringify({ error: 'ไม่พบ .xterm-rows — DOM renderer ไม่ทำงาน' });

  const cellWidth = term._core._renderService.dimensions.css.cell.width;
  const buffer = term.buffer.active;
  const lines = [];
  for (let i = 0; i < term.rows; i++) {
    const line = buffer.getLine(buffer.viewportY + i);
    if (!line) continue;
    const text = line.translateToString(true).trimEnd();
    if (!text.endsWith('|')) continue;

    const rowElement = rowsElement.children[i];
    if (!rowElement) continue;
    // ช่องที่ใส่เคอร์เซอร์ไม่ใช่เนื้อหาของบรรทัด จึงไม่นับ
    const spans = [...rowElement.children].filter((span) => !span.classList.contains('xterm-cursor'));
    const last = spans[spans.length - 1];
    if (!last) continue;

    const rowLeft = rowElement.getBoundingClientRect().left;
    lines.push({ text, renderedColumns: (last.getBoundingClientRect().right - rowLeft) / cellWidth });
  }
  return JSON.stringify({ cellWidth, lines });
})()`);

const payload = JSON.parse(raw);
if (payload.error) {
  console.error(payload.error);
  await app.close();
  process.exit(1);
}

const { cellWidth, lines } = payload;

// ความกว้าง cell ที่ xterm คำนวณได้คลาดจากความกว้างจริงของ glyph ประมาณ 0.06 คอลัมน์
// (วัดจากกรอบ span ซึ่งรวม letter-spacing ท้ายบรรทัด ต่างจากการวัดหมึกของตัวอักษรแบบเดิม)
// ค่านี้เกิดกับทั้งบรรทัด ASCII จึงใช้บรรทัด ASCII เป็นจุดอ้างอิงแล้วหักออกเหมือนเดิม
// เหลือเฉพาะส่วนที่ภาษาไทยทำให้เกินซึ่งคือสิ่งที่ต้องการตรวจ
const isAsciiOnly = (text) => [...text].every((character) => character.codePointAt(0) < 0x80);
const reference = lines.filter((line) => isAsciiOnly(line.text));
const calibration =
  reference.reduce((sum, line) => sum + (line.renderedColumns - expectedColumns(line.text)), 0) /
  reference.length;

console.log(`cell width = ${cellWidth.toFixed(3)} px`);
console.log(`อ้างอิงจากบรรทัด ASCII ล้วน ${reference.length} บรรทัด (offset ${calibration.toFixed(4)} คอลัมน์)`);
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

await app.close();

process.exit(failed === 0 ? 0 : 1);
