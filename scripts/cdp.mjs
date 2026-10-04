// ตัวช่วยเล็กๆ สำหรับขับแอป Electron ผ่าน Chrome DevTools Protocol
// ใช้เก็บหลักฐาน (screenshot) และจับ error ใน console โดยไม่ต้องแตะโค้ดแอป
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import electronBinary from 'electron';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function waitForPageTarget(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        return page;
      }
    } catch {
      // ยังไม่พร้อม รอต่อ
    }
    await sleep(250);
  }
  throw new Error('ไม่พบ page target จาก Electron remote debugging');
}

function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  const listeners = [];
  let nextId = 1;

  const ready = new Promise((resolveReady, rejectReady) => {
    ws.addEventListener('open', () => resolveReady());
    ws.addEventListener('error', (event) => rejectReady(new Error(`websocket error: ${event.type}`)));
  });

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve: ok, reject: fail } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        fail(new Error(`${message.error.message} (${message.method ?? ''})`));
      } else {
        ok(message.result);
      }
      return;
    }
    for (const listener of listeners) {
      listener(message);
    }
  });

  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolveSend, rejectSend) => {
      pending.set(id, { resolve: resolveSend, reject: rejectSend });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return {
    send,
    on: (listener) => listeners.push(listener),
    close: () => ws.close(),
    ready,
  };
}

export async function launchApp({ port = 9222, env = {} } = {}) {
  const child = spawn(electronBinary, ['.', `--remote-debugging-port=${port}`], {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const logs = [];
  child.stdout.on('data', (chunk) => logs.push(`[stdout] ${chunk}`));
  child.stderr.on('data', (chunk) => logs.push(`[stderr] ${chunk}`));

  const target = await waitForPageTarget(port);
  const cdp = connect(target.webSocketDebuggerUrl);
  await cdp.ready;

  const consoleErrors = [];
  const consoleMessages = [];
  cdp.on((message) => {
    if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      consoleErrors.push(`exception: ${details.exception?.description ?? details.text}`);
    }
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      consoleErrors.push(`log: ${message.params.entry.text}`);
    }
    if (message.method === 'Runtime.consoleAPICalled') {
      const text = message.params.args.map((a) => a.value ?? a.description).join(' ');
      consoleMessages.push(`[${message.params.type}] ${text}`);
      if (message.params.type === 'error') {
        consoleErrors.push(`console.error: ${text}`);
      }
    }
  });

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');

  return {
    logs,
    consoleErrors,
    consoleMessages,

    async shot(relativePath, { clip, scale } = {}) {
      const params = { format: 'png' };
      if (clip) {
        params.clip = { x: clip.x, y: clip.y, width: clip.width, height: clip.height, scale: scale ?? 1 };
      } else if (scale) {
        params.clip = { x: 0, y: 0, width: 0, height: 0, scale };
      }
      const { data } = await cdp.send('Page.captureScreenshot', params);
      const target = resolve(projectRoot, relativePath);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, Buffer.from(data, 'base64'));
      return relativePath;
    },

    /** พิมพ์ข้อความลง terminal (ไม่ใช้ key event เพื่อให้รองรับอักษรไทย/อักขระพิเศษ) */
    async type(text) {
      await cdp.send('Input.insertText', { text });
    },

    async press(key, { code, keyCode, modifiers = 0 } = {}) {
      const base = { key, code: code ?? key, windowsVirtualKeyCode: keyCode, nativeVirtualKeyCode: keyCode, modifiers };
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base });
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },

    async enter() {
      await this.press('Enter', { code: 'Enter', keyCode: 13 });
    },

    async evaluate(expression) {
      const result = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      return result.result?.value;
    },

    /** ข้อความที่มองเห็นอยู่บนหน้าจอ (ใช้รอว่าโปรแกรมในเทอร์มินัลทำงานเสร็จหรือยัง) */
    async visibleText() {
      return this.evaluate(`(() => {
        const term = window.__terminal;
        const buffer = term.buffer.active;
        const lines = [];
        for (let i = 0; i < term.rows; i++) {
          lines.push(buffer.getLine(buffer.viewportY + i)?.translateToString(true) ?? '');
        }
        return lines.join('\\n');
      })()`);
    },

    /** รอจน prompt ของ PowerShell แสดงเต็ม (ถ้าพิมพ์เร็วเกินไปอักขระแรกจะหายหรือซ้ำ) */
    async waitForPrompt({ timeoutMs = 30_000 } = {}) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const ready = await this.evaluate(`(() => {
          const term = window.__terminal;
          const buffer = term.buffer.active;
          // prompt จะอยู่ที่ "บรรทัดว่างสุดท้ายที่ยังมีข้อความ" เพราะหลังจากนั้นเป็นบรรทัดว่าง
          for (let i = term.rows - 1; i >= 0; i--) {
            const text = (buffer.getLine(buffer.viewportY + i)?.translateToString(true) ?? '').trimEnd();
            if (text === '') continue;
            return /^PS .+>\$/.test(text);
          }
          return false;
        })()`);
        if (ready) {
          return true;
        }
        await sleep(250);
      }
      throw new Error(`รอ prompt ของ PowerShell ไม่สำเร็จภายใน ${timeoutMs} ms`);
    },

    async waitForText(text, { timeoutMs = 180_000, intervalMs = 700 } = {}) {
      const deadline = Date.now() + timeoutMs;
      let seen = await this.visibleText();
      while (!seen.includes(text)) {
        if (Date.now() > deadline) {
          throw new Error(`รอ "${text}" ไม่สำเร็จภายใน ${timeoutMs} ms`);
        }
        await sleep(intervalMs);
        seen = await this.visibleText();
      }
      return seen;
    },

    /** จำลองการย่อ/ขยายหน้าต่าง (viewport) เพื่อทดสอบว่า fit + pty.resize ทำงานตรงกัน */
    async setViewport(width, height) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
    },

    async close() {
      cdp.close();
      child.kill();
      await sleep(500);
    },
  };
}

export { sleep, projectRoot };
