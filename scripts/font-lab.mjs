// เปรียบเทียบฟอนต์ไทย: เขียน --terminal-font-family ลง style.css, build ใหม่, รันชุดทดสอบ
// แล้วบันทึก screenshot ของข้อความชุดเดียวกันไว้เทียบกัน
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { launchApp, sleep, projectRoot } from './cdp.mjs';

const VITE_BIN = resolve(projectRoot, 'node_modules/vite/bin/vite.js');

const CANDIDATES = [
  { id: 'a-cascadia-noto', family: "'Cascadia Mono', 'Noto Sans Thai', monospace" },
  { id: 'b-cascadia-sarabun', family: "'Cascadia Mono', 'Sarabun', monospace" },
  { id: 'c-cascadia-plex', family: "'Cascadia Mono', 'IBM Plex Sans Thai', monospace" },
  { id: 'd-notomono-noto', family: "'Noto Sans Mono', 'Noto Sans Thai', monospace" },
];

const stylePath = resolve(projectRoot, 'src/renderer/style.css');
const originalStyle = readFileSync(stylePath, 'utf8');

function applyFamily(family) {
  writeFileSync(
    stylePath,
    originalStyle.replace(/--terminal-font-family:[^;]+;/, `--terminal-font-family: ${family};`),
    'utf8',
  );
}

try {
  for (const candidate of CANDIDATES) {
    applyFamily(candidate.family);
    execFileSync(process.execPath, [VITE_BIN, 'build'], { cwd: projectRoot, stdio: 'pipe' });

    const app = await launchApp();
    await app.waitForPrompt();
    await sleep(500);
    await app.type('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/thai-test.ps1');
    await app.enter();
    await sleep(4000);
    const shot = await app.shot(`docs/evidence/fonts/${candidate.id}.png`);
    const zoom = await app.shot(`docs/evidence/fonts/${candidate.id}-zoom.png`, {
      clip: { x: 4, y: 128, width: 480, height: 210 },
      scale: 3,
    });
    console.log(`${candidate.id} -> ${shot}, ${zoom} | console errors: ${app.consoleErrors.length}`);
    await app.close();
    await sleep(1000);
  }
} finally {
  writeFileSync(stylePath, originalStyle, 'utf8');
}
