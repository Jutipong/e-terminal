import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { CanvasAddon } from '@xterm/addon-canvas';
import '@xterm/xterm/css/xterm.css';
// ฟอนต์ที่ฝังมาด้วยตัวเอง เพื่อให้ผลลัพธ์เหมือนกันทุกเครื่อง
// ตัวที่เลือกใช้จริงคือ Noto Sans Mono + Noto Sans Thai (ดูผลเปรียบเทียบใน docs/evidence/fonts/)
// ที่เหลือโหลดไว้เพื่อให้สลับมาทดสอบเทียบได้ผ่าน scripts/font-lab.mjs โดยไม่ต้องแก้โค้ด
import '@fontsource/noto-sans-mono/latin-400.css';
import '@fontsource/noto-sans-thai/thai-400.css';
import '@fontsource/noto-sans-thai/latin-400.css';
import '@fontsource/sarabun/thai-400.css';
import '@fontsource/sarabun/latin-400.css';
import '@fontsource/ibm-plex-sans-thai/thai-400.css';
import '@fontsource/ibm-plex-sans-thai/latin-400.css';
import './style.css';

const DEFAULT_FONT_SIZE = 15;

const rootStyle = getComputedStyle(document.documentElement);
const cssVar = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback;
const fontFamily = cssVar('--terminal-font-family', 'monospace');
const fontSize = Number.parseFloat(cssVar('--terminal-font-size', '')) || DEFAULT_FONT_SIZE;

/**
 * xterm.js วัดความกว้างตัวอักษรตอนสร้าง Terminal และแคชผลนั้นไว้
 * ถ้าฟอนต์เว็บยังไม่โหลดตอนวัด ค่าที่ได้จะผิด แล้วอักขระไทยจะไม่ลงตรงช่อง
 * จึงต้องบังคับโหลดฟอนต์ในสแต็กให้เสร็จก่อนสร้าง Terminal
 */
async function waitForFonts() {
  // Vite แทรก <link stylesheet> ไว้หลัง <script module> ตัว script จึงรันได้ก่อน CSS โหลดเสร็จ
  // ถ้าไม่รอ CSS @font-face จะยังไม่ถูกลงทะเบียนใน document.fonts และฟอนต์จะไม่ถูกโหลด
  await Promise.all(
    Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(
      (link) =>
        new Promise((resolve) => {
          if (link.sheet) {
            resolve();
            return;
          }
          link.addEventListener('load', resolve, { once: true });
          link.addEventListener('error', resolve, { once: true });
        }),
    ),
  );

  const sample = 'Aaก';
  // getComputedStyle คืนค่าชื่อฟอนต์ที่อ้างด้วยเครื่องหมายคำพูด (อาจเป็น ' หรือ ") จึงรองรับทั้งสองแบบ
  const requested = [...fontFamily.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);

  // ฟอนต์ระบบ (เช่น Cascadia Mono) ไม่มี @font-face ให้ตรวจสถานะ จึงเอาเฉพาะที่ประกาศไว้ใน CSS
  const declared = new Set([...document.fonts].map((face) => face.family.replace(/^["']|["']$/g, '')));
  const webFonts = requested.filter((family) => declared.has(family));

  for (let attempt = 0; attempt < 30; attempt++) {
    await Promise.all(requested.map((family) => document.fonts.load(`${fontSize}px "${family}"`, sample)));
    await document.fonts.ready;
    const stillLoading = webFonts.some(
      (family) => ![...document.fonts].some((face) => face.family.replace(/^["']|["']$/g, '') === family && face.status === 'loaded'),
    );
    if (!stillLoading) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.warn(`[terminal] โหลดฟอนต์เว็บไม่สำเร็จ: ${webFonts.join(', ')}`);
}

async function main() {
  await waitForFonts();

  const container = document.getElementById('terminal');
  const term = new Terminal({
    fontFamily,
    fontSize,
    cursorBlink: true,
    theme: {
      background: cssVar('--terminal-bg', '#0c0c0c'),
      foreground: cssVar('--terminal-fg', '#e6e6e6'),
    },
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  // ต้องใช้ canvas renderer: DOM renderer คูณ letter-spacing ตามความกว้างตัวอักษร
  // ซึ่งทำให้อักขระไทย (ฟอนต์ไม่ monospace) ไม่ลงตรงช่องและเกิด column drift
  term.loadAddon(new CanvasAddon());
  term.open(container);
  // ให้สคริปต์เก็บหลังฐาน (scripts/*.mjs) อ่าน cols/rows และ buffer ได้
  window.__terminal = term;
  term.focus();

  term.onData((data) => window.terminalAPI.write(data));
  window.terminalAPI.onData((data) => term.write(data));
  window.terminalAPI.onExit(({ exitCode }) => {
    term.writeln(`\r\n[process exited with code ${exitCode}]`);
  });

  function syncSize() {
    fitAddon.fit();
    window.terminalAPI.resize(term.cols, term.rows);
  }

  new ResizeObserver(() => syncSize()).observe(container);
  window.addEventListener('resize', syncSize);

  syncSize();
  window.terminalAPI.spawn({ cols: term.cols, rows: term.rows });
}

main();
