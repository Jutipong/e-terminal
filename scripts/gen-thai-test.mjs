// สร้าง scripts/thai-test.ps1 — ชุดข้อความทดสอบภาษาไทยสำหรับเก็บหลักฐาน (ใช้ซ้ำได้ อย่าแก้ไฟล์ที่ generate ออกมาโดยตรง)
//
// หลักการ: ทุกบรรทัดถูกเติมช่องว่างจน "ความกว้างเชิงคอลัมน์" เท่ากันหมด
// ดังนั้นตัว "|" ท้ายบรรทัดต้องตรงกันหมดในภาพ screenshot ถ้าความกว้างอักขระถูกต้อง
// (อักขระไทยพยัญชนะ/สระ/วรรณยุกต์ = 1 คอลัมน์, ยกเว้นสระและวรรณยุกต์ที่ซ้อนบนพยัญชนะ = 0 คอลัมน์)
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** ช่วงอักขระไทยที่เป็นสระ/วรรณยุกต์/ทัณฑฆาต จึงไม่กินคอลัมน์เพิ่ม */
const ZERO_WIDTH_RANGES = [
  [0x0e31, 0x0e31], // ั ั
  [0x0e34, 0x0e3a], // ิ ี ึ ื ุ ู ฺ
  [0x0e47, 0x0e4e], // ็ ่ ้ ๊ ๋ ์ ํ ๎
];

function charWidth(codePoint) {
  for (const [start, end] of ZERO_WIDTH_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return 0;
    }
  }
  return 1;
}

function displayWidth(text) {
  let width = 0;
  for (const character of text) {
    width += charWidth(character.codePointAt(0));
  }
  return width;
}

const TARGET_WIDTH = 68;
const INNER_WIDTH = TARGET_WIDTH - 2;

const groups = [
  {
    title: '1. ข้อความไทยทั่วไป',
    lines: [
      'สวัสดีครับ นี่คือการทดสอบภาษาไทยใน terminal',
      'กรุงเทพมหานคร ประเทศไทย ยินดีต้อนรับ',
      'ทดสอบอักขระไทย ก ข ค ง จ ฉ ช ซ ฌ ญ ฎ ฏ ฐ ฑ ฒ ณ ด ต ถ ท ธ น บ',
    ],
  },
  {
    title: '2. สระบน/ล่าง + วรรณยุกต์ (ไม่ควรกินคอลัมน์เพิ่ม)',
    lines: [
      'ก้อนเอกปี่ป้ายผีผึ้งเตี๋ยวเกาะไกล',
      'ข้อความที่มีทั้งสระบนและสระล่างปนกัน',
      'จําเรื่องราวที่เกิดขึ้นเมื่อวานนี้',
    ],
  },
  {
    title: '3. ตัวเลขไทย + อักษรละติน',
    lines: [
      '๐๑๒๓๔๕๖๗๘๙ ปี พ.ศ. ๒๕๖๗',
      'หนึ่ง สอง สาม สี่ ห้า หก เจ็ด แปด เก้า สิบ',
    ],
  },
  {
    title: '4. กรอบ ASCII ผสมภาษาไทย (ตรวจ column alignment)',
    box: true,
    lines: [
      '-'.repeat(INNER_WIDTH),
      padToWidth('กขคงจฉชซญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ', INNER_WIDTH),
      padToWidth('012345678901234567890123456789012345678901234567890123456789012345', INNER_WIDTH),
      padToWidth('ก้อนเอกปี่ป้ายผีผึ้งเตี๋ยวเกาะไกล', INNER_WIDTH),
      padToWidth('ข้อความภาษาไทยปนกับ ascii text ตรงนี้', INNER_WIDTH),
      padToWidth('   ^ ตรงกันทุกบรรทัด ^   ', INNER_WIDTH),
      '-'.repeat(INNER_WIDTH),
    ],
  },
];

/** เติมช่องว่างให้ครบตาม "ความกว้างเชิงคอลัมน์" ไม่ใช่จำนวนอักขระ */
function padToWidth(text, width) {
  const missing = width - displayWidth(text);
  if (missing < 0) {
    throw new Error(`บรรทัดยาวเกิน ${width} คอลัมน์: ${text}`);
  }
  return text + ' '.repeat(missing);
}

function padTo(text) {
  return `${padToWidth(text, TARGET_WIDTH)}|`;
}

const lines = groups.flatMap((group) => [
  '',
  `Write-Host '=== ${group.title} ==='`,
  ...group.lines.map((line) =>
    group.box ? `Write-Host ('|${line}|')` : `Write-Host ('${padTo(line)}')`,
  ),
]);

const script = [
  '# สร้างโดย scripts/gen-thai-test.mjs — ห้ามแก้ด้วยมือ',
  '# ต้องบันทึกเป็น UTF-8 with BOM เพื่อให้ Windows PowerShell 5.1 อ่านภาษาไทยได้',
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
  "$OutputEncoding = [System.Text.Encoding]::UTF8",
  ...lines,
  '',
];

const target = resolve(projectRoot, 'scripts', 'thai-test.ps1');
writeFileSync(target, '﻿' + script.join('\r\n'), 'utf8');

console.log(`เขียน ${target}`);
console.log(`ทุกบรรทัดกว้าง ${TARGET_WIDTH} คอลัมน์ + ตัว "|" ในคอลัมน์ที่ ${TARGET_WIDTH + 1}`);
