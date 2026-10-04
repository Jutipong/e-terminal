# POC Terminal — Electron built-in terminal ที่แสดงผลภาษาไทยถูกต้อง

โปรแกรม Electron หน้าต่างเดียว มี terminal เต็มจอ (คล้าย terminal ใน VSCode)
ที่เปิด PowerShell จริงผ่าน PTY และเรนเดอร์ข้อความภาษาไทยจาก shell และจาก CLI
`opencode` / `pi` ได้ครบถ้วน ทั้งแบบ TUI และ non-interactive

ใช้ `node-pty` (PTY จริง รองรับ TUI / alt-screen) + `@xterm/xterm@6` (DOM renderer)
+ `@xterm/addon-unicode11`

---

## ต้องมีอะไรก่อน

| สิ่งที่ต้องมี | เวอร์ชันที่ทดสอบ | หมายเหตุ |
|---|---|---|
| Node.js | v22.23.2 | ต้องมี Node 20+ |
| Windows + PowerShell | Windows PowerShell 5.1 | ทดสอบบน Windows ผ่าน ConPTY; macOS/Linux ใช้ `$SHELL` แทน |
| `opencode` บน PATH | v2.0.22 | ต้อง login ให้เรียบร้อย (`opencode auth list`) |
| `pi` บน PATH | v1.0.2 | ต้อง login ให้เรียบร้อย (`pi auth`) |

## วิธีรัน

```bash
npm install
npm start
```

`npm start` จะ build renderer ด้วย Vite แล้วเปิดหน้าต่าง Electron พร้อม terminal เต็มจอ

มีตัวเลือกมุมขวาบนของหน้าต่าง เลือกได้ว่าจะเปิด `PowerShell` / `pi` / `opencode`
(เลือก `pi` หรือ `opencode` แล้วระบบจะรันผ่าน `chcp 65001` ก่อน เพื่อไม่ให้ ConPTY
เปิด console มาด้วย codepage 437 แล้วภาษาไทยกลายเป็น mojibake)

> ถ้า `npm install` ไม่ดาวน์โหลดไบนารี Electron มาให้เอง ให้รัน
> `node node_modules/electron/install.js` แล้วลอง `npm start` ใหม่

## โครงสร้างโปรเจกต์

```
src/main/main.js       process หลัก: เปิดหน้าต่าง, spawn pty, ส่งข้อมูลผ่าน IPC
src/main/preload.js    contextBridge ที่เปิดเผยเฉพาะ terminalAPI
src/renderer/main.js   สร้าง xterm, fit ขนาด, ผูก pty
src/renderer/style.css ตัวแปรฟอนต์/สี + layout ที่ไม่ให้แถวสุดท้ายถูกตัด
scripts/               เครื่องมือเก็บหลักฐาน/ตรวจผล (ดูหัวข้อ "ตรวจผลและเก็บหลักฐาน")
docs/evidence/         ภาพหลักฐานทุกกรณี
```

## ทำไมภาษาไทยจึงแสดงผลถูกต้อง — 4 ประเด็นสำคัญ

1. **ใช้ DOM renderer ของ `@xterm/xterm@6`**
   DOM renderer เขียน grapheme cluster ทั้งก้อน (ตัวฐาน + สระ + วรรณยุกต์) ลง `<span>` เดียว
   เบราว์เซอร์จึงจัดรูปแบบด้วย GPOS เอง → สระ/วรรณยุกต์ทับฐานถูกตำแหน่ง
   ส่วน canvas renderer (`@xterm/addon-canvas`) ไม่ทำ shaping ภาษาไทยเลย
   ภาพเทียบได้ที่ [`docs/evidence/thai-cli/`](docs/evidence/thai-cli/) โดย xterm 6 ถอด
   canvas renderer ออกไปแล้ว และการกลับไปใช้ addon ตัวเก่าจะเสีย Kitty keyboard
   protocol ที่ `opencode` ใช้

2. **ใช้ `Unicode11Addon` + `unicode.activeVersion = '11'`**
   ตารางความกว้างอักขระมาจาก Unicode 11 ตรงกับที่ `pi-tui` ใช้เอง

3. **ปล่อยให้ระบบเลือกฟอนต์ไทยเอง**
   `'Cascadia Mono', 'Leelawadee UI', monospace` — Cascadia รับผิดชอบละติน/ASCII/
   box-drawing ส่วนภาษาไทย fallback ไป `Leelawadee UI` ที่ Windows มาพร้อมเครื่อง
   ผลขึ้นกับเครื่อง ดูผลเปรียบเทียบ 4 ตัวที่
   [`docs/evidence/fonts/README.md`](docs/evidence/fonts/README.md)

4. **ภาษาไทยใช้พื้นที่ช่องเท่ากับอักษรละติน 1 ช่อง**
   สระ/วรรณยุกต์/ทัณฑฆาต (U+0E31, U+0E34–U+0E3A, U+0E47–U+0E4E) ถูกนับเป็นความกว้าง 0
   ตรงกับตาราง `wcwidth` ของ xterm.js เอง (ตรวจยืนยันได้ด้วย `npm run check:width-table`)

นอกจากนี้ยังต้องบังคับ UTF-8 ก่อนเปิด CLI (`chcp 65001`) และย้าย `padding` ของ
terminal ไปไว้ที่ `.xterm` ไม่ใช่ container เพราะ `FitAddon` หัก padding ของ `.xterm`
ออกจากความสูงของ parent ถ้า padding อยู่ที่ parent เองจะถูกนับซ้ำจนแถวสุดท้ายถูกตัด

## ตรวจผลและเก็บหลักฐาน

สคริปต์ทั้งหมดขับแอปจริงผ่าน Chrome DevTools Protocol (เปิดด้วย
`--remote-debugging-port`) แล้วพิมพ์คำสั่ง/กดปุ่มจริง จับภาพหน้าจอ และอ่าน buffer ของ
xterm ผ่าน `window.__terminal` — ไม่ต้องแตะโค้ดแอปเพิ่ม

| คำสั่ง | ตรวจอะไร | หลักฐาน |
|---|---|---|
| `npm run check:width-table` | ตารางความกว้างอักขระไทยของ xterm.js ตรงกับที่ชุดทดสอบคิดไว้ | พิมพ์ผลลง console |
| `npm run check:thai-width` | **column drift ของข้อความไทย** ทุกบรรทัด | [`shell/05-thai-alignment.png`](docs/evidence/shell/05-thai-alignment.png) |
| `npm run check:fonts` | เปรียบเทียบฟอนต์ 4 ตัวด้วยข้อความชุดเดียวกัน | [`docs/evidence/fonts/`](docs/evidence/fonts/README.md) |
| `node scripts/check-pty.mjs` | พิมพ์คำสั่ง / ลูกศรเรียก history / Ctrl+C | [`shell/`](docs/evidence/shell/) |
| `node scripts/check-resize.mjs` | ย่อ-ขยายหน้าต่างแล้ว PTY กับ xterm ตรงกัน | [`resize/`](docs/evidence/resize/) |
| `node scripts/check-opencode-run.mjs` | `opencode run "..."` ตอบเป็นภาษาไทย | [`opencode/01-run.png`](docs/evidence/opencode/01-run.png) |
| `node scripts/check-opencode-tui.mjs` | TUI, alt-screen, ลูกศรเลื่อนเมนู, พิมพ์ไทยในช่อง prompt | [`opencode/`](docs/evidence/opencode/) |
| `node scripts/check-pi-print.mjs` | `pi -p "..."` ตอบเป็นภาษาไทย | [`pi/01-print.png`](docs/evidence/pi/01-print.png) |
| `node scripts/check-pi-tui.mjs` | TUI ของ pi + พิมพ์ไทยในช่อง prompt | [`pi/`](docs/evidence/pi/) |
| `node scripts/capture-thai-cli.mjs before\|after` | ภาพเทียบก่อน/หลังของไทยใน pi, opencode, แถวบน-ล่างสุด, กรอบ ASCII | [`thai-cli/`](docs/evidence/thai-cli/) |
| `npm run evidence` | รันทั้งหมดข้างบนตามลำดับ | ทั้งโฟลเดอร์ `docs/evidence/` |

> สคริปต์ที่เรียก `opencode` / `pi` ต้อง login ให้เรียบร้อย และใช้เวลาสักครู่
> (มี timeout 240 วินาที) คำสั่ง prompt ภาษาไทยเก็บไว้ใน `scripts/prompts/`

ชุดข้อความทดสอบภาษาไทยสร้างจาก `scripts/gen-thai-test.mjs` เขียนเป็น
`scripts/thai-test.ps1` (UTF-8 with BOM เพื่อให้ PowerShell 5.1 อ่านไทยได้)
ทุกบรรทัดถูกเติมช่องว่างจนกว้างเท่ากันตาม *จำนวนคอลัมน์* ถ้าการเรนเดอร์ถูกต้อง
ตัว `|` ท้ายทุกบรรทัดจะตรงกันหมด

## ผลที่วัดได้

- `npm run check:thai-width` → ผ่าน 15/15 บรรทัด คลาดเคลื่อนสูงสุด **0.011 คอลัมน์**
  (วิธีวัดเปลี่ยนไป ดูหมายเหตุใน [`docs/evidence/README.md`](docs/evidence/README.md))
- ภาพเทียบก่อน/หลังอยู่ที่ [`docs/evidence/thai-cli/`](docs/evidence/thai-cli/)
- ไม่มี error ใน DevTools console และ main process log ของทุกสถานการณ์ที่ทดสอบ
- `opencode run` และ `pi -p` ตอบเป็นภาษาไทยครบถ้วน
- ทั้ง TUI ของ `opencode` และ `pi` เปิดได้ แสดงสี/เส้นกรอบถูกต้อง และรับปุ่มลูกศรผ่าน PTY
- แถวบนสุดและแถวล่างสุดของหน้าจอไม่ถูกตัด (วัดได้ `topGap 0px` / `bottomGap +0.8px`)

## ข้อจำกัดที่ยังแก้ไม่ได้

- **รอย 1px ต่อบรรทัดใน ASCII art** เห็นได้ในโลโก้ `opencode` เพราะ cell height ที่
  Chromium วัดได้เป็นทศนิยม (`18.4118px`) แต่ละแถวจึงถูก rasterize คนละตำแหน่ง
  ทางแก้คือกลับไปใช้ canvas/webgl renderer ซึ่งจะเสียการจัดรูปแบบภาษาไทย
  เลือกความถูกของภาษาไทยไว้
- **ผลขึ้นกับฟอนต์ที่ติดตั้งในแต่ละเครื่อง** เพราะไม่ฝังฟอนต์มาในโปรเจกต์
- **ช่องว่างรอบสระนำหน้า** (`เ`, `แ`) เป็นข้อจำกัดของการแบ่งหน้าจอเป็นช่องของ terminal ทุกตัว

## ขอบเขต

**ทำแล้ว:** หน้าต่างเดียว terminal เต็มจอ, PTY, IPC bridge, DOM renderer + Unicode 11,
เลือกเปิด PowerShell / pi / opencode, fit ตามขนาดหน้าต่าง, ทดสอบ CLI, README

**ยังไม่ทำ (ตามที่ตกลงกัน):** แพ็กเป็น `.exe` (electron-builder), split terminal หลายอัน,
sidebar/tabs/file explorer, ธีมแบบเต็มระบบ, เก็บ session, remote SSH, plugin system

## ข้อควรรู้

- ตอนปิดหน้าต่าง pty จะถูก kill ไม่เหลือ process ค้าง
- ตอนเริ่มแอป Chromium ยังวัดความสูงตัวอักษรไม่ครบ รหัสจึงวัดขนาดซ้ำเป็นช่วง ๆ ช่วงแรก
  ถ้าไม่ทำแบบนี้จำนวนแถวจะเกินจริงประมาณ 1 แถวและแถวสุดท้ายจะถูกตัด
