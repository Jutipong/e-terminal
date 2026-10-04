// เก็บภาพหลักฐานภาษาไทยชุดเดียวกันทั้งสถานะ "ก่อน" และ "หลัง" เพื่อให้เทียบกันได้
//
//   node scripts/capture-thai-cli.mjs before
//   node scripts/capture-thai-cli.mjs after
//
// ชุดทดสอบเดียวกันทุกสถานี: "กั๋ ปู่ สือ ที่ กำ สวัสดีครับ"
// (มีวรรณยุกต์บน สระบน สระล่าง ทัณฑฆาต ครบ ตามเกณฑ์ข้อ 2-4)
import { launchApp, sleep } from './cdp.mjs';

const LABEL = process.argv[2];
if (LABEL !== 'before' && LABEL !== 'after') {
  console.error('ใช้: node scripts/capture-thai-cli.mjs before|after');
  process.exit(1);
}

const THAI = 'กั๋ ปู่ สือ ที่ กำ สวัสดีครับ';
const out = (name) => `docs/evidence/thai-cli/${LABEL}/${name}.png`;

/** เขียนข้อความไทยลงแถวบนสุดและแถวล่างสุดของหน้าจอโดยตรง (เกณฑ์ข้อ 2) */
async function writeEdgeRows(app) {
  const raw = await app.evaluate(`(() => {
    const term = window.__terminal;
    if (!term) return JSON.stringify({ error: 'ไม่พบ window.__terminal' });
    const text = ${JSON.stringify(THAI)};
    // ล้างหน้าจอก่อน แล้วค่อยเขียนลงแถวแรกและแถวสุดท้าย (2J ล้างทั้งจอ จึงต้องมาก่อน)
    term.write('\\x1b[2J');
    term.write('\\x1b[1;1H' + text);
    term.write('\\x1b[' + term.rows + ';1H' + text);
    return JSON.stringify({ rows: term.rows, cols: term.cols });
  })()`);
  console.log('edge rows ->', raw);
}

/** รันชุดทดสอบเดียวกันทุกสถานี: TUI ของ pi / TUI ของ opencode / แถวขอบบน-ล่าง */
const scenarios = {
  async 'pi-tui-input'(app) {
    await app.type('pi');
    await app.enter();
    await sleep(15_000);
    await app.type(THAI);
    await sleep(1500);
  },

  async 'opencode-tui-input'(app) {
    await app.type('opencode');
    await app.enter();
    await sleep(12_000);
    await app.type(THAI);
    await sleep(1500);
  },

  async 'shell-edges'(app) {
    // วัดว่าหน้าจอพอดี: แถวบนสุดต้องไม่โดนตัดบน และแถวล่างสุดต้องไม่โดนตัดล่าง
    console.log('layout:', await app.evaluate(`(() => {
      const termEl = document.querySelector('.xterm');
      const screen = document.querySelector('.xterm-screen');
      const rowsEl = document.querySelector('.xterm-rows');
      const viewport = document.querySelector('.xterm-viewport');
      const term = window.__terminal;
      const box = termEl.getBoundingClientRect();
      const pad = (n) => parseFloat(getComputedStyle(termEl)[n]) || 0;
      const first = rowsEl.children[0].getBoundingClientRect();
      const last = rowsEl.children[term.rows - 1].getBoundingClientRect();
      return JSON.stringify({
        rows: term.rows,
        bufferRows: term.buffer.active.length,
        topGapPx: +(first.top - (box.top + pad('paddingTop'))).toFixed(2),
        bottomGapPx: +((box.bottom - pad('paddingBottom')) - last.bottom).toFixed(2),
        viewportScrollbarHidden: getComputedStyle(viewport).scrollbarWidth === 'none',
        viewportClientW: viewport.clientWidth,
        viewportOffsetW: viewport.offsetWidth,
        screenW: screen.getBoundingClientRect().width
      });
    })()`));

    await writeEdgeRows(app);
    await sleep(500);
  },

  async 'shell-box'(app) {
    await app.type('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/thai-test.ps1');
    await app.enter();
    await sleep(4000);
  },
};

for (const [name, run] of Object.entries(scenarios)) {
  const app = await launchApp();
  await app.waitForPrompt();
  await sleep(500);
  await run(app);
  const path = await app.shot(out(name));
  console.log(`\n[${name}] -> ${path}`);
  console.log('--- เนื้อหาบนหน้าจอ ---');
  console.log(await app.visibleText());
  console.log('console errors:', JSON.stringify(app.consoleErrors));
  await app.close();
}
