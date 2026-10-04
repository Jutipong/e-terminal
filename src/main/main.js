const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const pty = require('node-pty');

const RENDERER_HTML = path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html');

let mainWindow = null;
/** @type {import('node-pty').IPty | null} */
let ptyProcess = null;

/**
 * ConPTY เปิด console มาด้วย codepage 437 ซึ่งทำให้ภาษาไทยกลายเป็น mojibake
 * (`echo สวัสดี` -> `*'1*5`) ทุก target จึงต้องตั้ง UTF-8 ให้ตัวเองก่อนรับอินพุตหรือพิมพ์ผล
 * (ทำมาจาก src/main/main.js ของ poc-terminal-grill)
 */
const TARGETS = {
  shell: {
    file: 'powershell.exe',
    args: [],
  },
  pi: {
    file: 'cmd.exe',
    args: ['/c', 'chcp 65001 >nul & pi'],
  },
  opencode: {
    file: 'cmd.exe',
    args: ['/c', 'chcp 65001 >nul & opencode'],
  },
};

function defaultShell() {
  if (process.platform === 'win32') {
    return TARGETS.shell;
  }
  return { file: process.env.SHELL || '/bin/bash', args: ['-l'] };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    backgroundColor: '#000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(RENDERER_HTML);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** ส่งข้อความไป renderer อย่างปลอดภัย (หน้าต่างอาจถูกปิดไปแล้วระหว่างที่ pty ยังคืนข้อมูล) */
function sendToRenderer(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
    return;
  }
  mainWindow.webContents.send(channel, payload);
}

function disposePty() {
  if (!ptyProcess) {
    return;
  }
  const dying = ptyProcess;
  ptyProcess = null;
  try {
    dying.kill();
  } catch (error) {
    console.error('[pty] kill failed:', error);
  }
}

function spawnPty({ cols, rows, cwd, target }) {
  disposePty();

  const { file, args } = TARGETS[target] ?? defaultShell();
  // TERM ต้องบอก TUI ว่าเรารองรับสี 256/truecolor ไม่งั้น opencode/pi จะลดระดับ output
  const env = { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' };

  console.log(`[pty] spawn ${file} ${args.join(' ')} cols=${cols} rows=${rows} cwd=${cwd}`);
  const child = pty.spawn(file, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env,
    // ไม่ใช้ ConPTY ตัวเก่า: kill() ของมัน fork helper ที่เรียก AttachConsole แล้วค้าง 5 วินาที
    useConptyDll: process.platform === 'win32',
  });
  ptyProcess = child;

  child.onData((data) => {
    sendToRenderer('terminal:data', data);
  });

  child.onExit(({ exitCode, signal }) => {
    console.log(`[pty] exit code=${exitCode} signal=${signal}`);
    // โปรเซสเก่ามักออกช้ากว่าตัวที่เพิ่งสปอว์์แทนมัน ถ้าเคลียร์ ptyProcess
    // ทุกครั้งที่มี exit ตัวใหม่จะหลุดจากตัวแปรและรับ input ไม่ได้
    if (ptyProcess !== child) {
      return;
    }
    ptyProcess = null;
    sendToRenderer('terminal:exit', { exitCode, signal });
  });
}

ipcMain.handle('terminal:spawn', (event, options) => {
  spawnPty({
    cols: Math.max(1, Math.floor(options?.cols) || 80),
    rows: Math.max(1, Math.floor(options?.rows) || 24),
    cwd: options?.cwd || process.cwd(),
    target: options?.target,
  });
  return true;
});

ipcMain.on('terminal:write', (_event, data) => {
  ptyProcess?.write(data);
});

ipcMain.on('terminal:resize', (_event, { cols, rows }) => {
  if (!ptyProcess) {
    return;
  }
  ptyProcess.resize(Math.max(1, cols), Math.max(1, rows));
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', disposePty);
