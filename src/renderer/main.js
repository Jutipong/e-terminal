import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import '@xterm/xterm/css/xterm.css';
import './style.css';

const DEFAULT_FONT_SIZE = 15;

const rootStyle = getComputedStyle(document.documentElement);
const cssVar = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback;
const fontFamily = cssVar('--terminal-font-family', 'monospace');
const fontSize = Number.parseFloat(cssVar('--terminal-font-size', '')) || DEFAULT_FONT_SIZE;

const targetSelect = document.getElementById('target');

/**
 * xterm.js วัดความกว้างตัวอักษรตอนสร้าง Terminal และแคชผลนั้นไว้
 * ถ้าฟอนต์ยังไม่พร้อมตอนวัด ค่าที่ได้จะผิด แล้วอักขระไทยจะไม่ลงตรงช่อง
 * จึงต้องรอให้ stylesheet โหลดเสร็จก่อนสร้าง Terminal
 */
async function waitForFonts() {
  // Vite แทรก <link stylesheet> ไว้หลัง <script module> ตัว script จึงรันได้ก่อน CSS โหลดเสร็จ
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

  await document.fonts.ready;
}

async function main() {
  await waitForFonts();

  const container = document.getElementById('terminal');
  const term = new Terminal({
    fontFamily,
    fontSize,
    cursorBlink: true,
    // ต้องเป็น 1.0: opencode วาดโลโก้ด้วย block element (█▀▄) ที่กินเต็ม em box
    // ถ้า cell สูงกว่านั้นจะเกิดช่องว่างในแนวนอน ทำให้ ASCII art เป็นรอย
    lineHeight: 1.0,
    // xterm 6 ย้าย Unicode11Addon ไปฝั่ง proposed API ต้องเปิดอนุญาตก่อน
    allowProposedApi: true,
    theme: {
      background: cssVar('--terminal-bg', '#0c0c0c'),
      foreground: cssVar('--terminal-fg', '#e6e6e6'),
    },
  });

  const fitAddon = new FitAddon();
  term.loadAddon(fitAddon);
  // xterm 6 ถอด canvas renderer ออกแล้ว เหลือ DOM renderer ตัวเดียว ซึ่งเขียน
  // grapheme cluster ทั้งก้อนลง <span> เดียว ให้เบราว์เซอร์จัดรูปแบบ (GPOS) เอง
  // canvas renderer ไม่ทำ shaping ภาษาไทย สระ/วรรณยุกต์จึงลอยผิดตำแหน่ง
  const unicode11 = new Unicode11Addon();
  term.loadAddon(unicode11);
  term.unicode.activeVersion = '11';
  term.open(container);
  // ให้สคริปต์เก็บหลังฐาน (scripts/*.mjs) อ่าน cols/rows และ buffer ได้
  window.__terminal = term;
  term.focus();

  term.onData((data) => window.terminalAPI.write(data));
  window.terminalAPI.onData((data) => term.write(data));
  window.terminalAPI.onExit(({ exitCode }) => {
    term.writeln(`\r\n[process exited with code ${exitCode}]`);
  });

  let lastSize = '';
  function syncSize() {
    fitAddon.fit();
    const size = `${term.cols}x${term.rows}`;
    if (size === lastSize) {
      return;
    }
    lastSize = size;
    window.terminalAPI.resize(term.cols, term.rows);
  }

  new ResizeObserver(() => syncSize()).observe(container);
  window.addEventListener('resize', syncSize);

  function spawn() {
    window.terminalAPI.spawn({ cols: term.cols, rows: term.rows, target: targetSelect.value });
  }

  // สลับ target = รีสตาร์ทโปรเซสใหม่ จึงล้างหน้าจอก่อนเสมอ
  targetSelect.addEventListener('change', () => {
    term.reset();
    spawn();
    term.focus();
  });

  syncSize();
  spawn();
  term.focus();

  // Chromium วัดความสูงตัวอักษรซ้ำอีกครั้งเมื่อฟอนต์ fallback ลงตัว (ราว 0.7 วินาทีหลังเปิด)
  // ถ้าวัดแค่ครั้งเดียวจำนวนแถวจะเกินจริงประมาณ 1 แถว และแถวสุดท้ายจะถูกตัด
  // จึงวัดซ้ำเป็นช่วง ๆ ตอนเริ่มจนกว่าจะนิ่ง
  const settleTimer = setInterval(syncSize, 100);
  setTimeout(() => clearInterval(settleTimer), 2000);
}

main();
