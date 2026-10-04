// ตรวจว่าตารางความกว้างอักขระของ xterm.js ตรงกับที่ scripts/gen-thai-test.mjs คิดไว้หรือไม่
// โดยการสกัดตาราง combining ranges ออกมาจาก bundle จริงของ xterm
// (ชื่อตัวแปรใน bundle ถูกย่อและอาจเปลี่ยนได้ จึงหาจากตัวคงที่ U+11062 แทน)
import fs from 'node:fs';

const { main: xtermEntry } = JSON.parse(
  fs.readFileSync('node_modules/@xterm/xterm/package.json', 'utf8').replace(/^\uFEFF/, ''),
);
const src = fs.readFileSync(`node_modules/@xterm/xterm/${xtermEntry}`, 'utf8');

// ช่วงที่ถัดมาใน bundle (ตัวแปร ASCII combining) คือจุดจบของช่วง combining ก่อนหน้า
const nextTableStart = src.indexOf('[[68097,68099]');
const rangesStart = src.lastIndexOf('[[', nextTableStart - 1);
if (nextTableStart < 0 || rangesStart < 0) {
  throw new Error('สกัดตาราง combining ranges ของ xterm ไม่สำเร็จ (bundle อาจเปลี่ยนรูปแบบ)');
}
// ระหว่างช่วง combining กับตารางถัดไปมีชื่อตัวแปรคั่นอยู่ (เช่น "]],n=") จึงต้องตัดที่ "]]" สุดท้าย
const rawSlice = src.slice(rangesStart, nextTableStart);
const combiningRanges = JSON.parse(rawSlice.slice(0, rawSlice.lastIndexOf(']]') + 2));

// สร้างตาราง width ตามตรรกะเดียวกับที่ xterm.js ใช้จริง
const width = new Uint8Array(65536).fill(1);
width[0] = 0;
width.fill(0, 1, 32);
width.fill(0, 127, 160);
width.fill(2, 4352, 4448);
width[9001] = 2;
width[9002] = 2;
width.fill(2, 11904, 42192);
width[12351] = 1;
width.fill(2, 44032, 55204);
width.fill(2, 63744, 64256);
width.fill(2, 65040, 65050);
width.fill(2, 65072, 65136);
width.fill(2, 65280, 65377);
width.fill(2, 65504, 65511);
for (const [from, to] of combiningRanges) {
  width.fill(0, from, to + 1);
}

const ZERO_WIDTH_RANGES = [
  [0x0e31, 0x0e31],
  [0x0e34, 0x0e3a],
  [0x0e47, 0x0e4e],
];

function myCharWidth(codePoint) {
  return ZERO_WIDTH_RANGES.some(([from, to]) => codePoint >= from && codePoint <= to) ? 0 : 1;
}

const differences = [];
for (let cp = 0x0e00; cp <= 0x0e7f; cp++) {
  if (myCharWidth(cp) !== width[cp]) {
    differences.push(`U+${cp.toString(16).toUpperCase().padStart(4, '0')} xterm=${width[cp]} mine=${myCharWidth(cp)}`);
  }
}

console.log('combining ranges:', combiningRanges.length);
console.log('differences in Thai block:', differences.length ? differences : 'none');

for (const line of ['ก้อนเอกปี่ป้ายผีผึ้งเตี๋ยวเกาะไกล', 'กขคงจฉชซญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ']) {
  let xtermWidth = 0;
  let myWidth = 0;
  for (const character of line) {
    const cp = character.codePointAt(0);
    xtermWidth += width[cp];
    myWidth += myCharWidth(cp);
  }
  console.log(`"${line}" -> xterm=${xtermWidth} mine=${myWidth} ${xtermWidth === myWidth ? 'OK' : 'MISMATCH'}`);
}
