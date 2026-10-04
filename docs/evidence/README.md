# หลักฐานการทดสอบภาษาไทย

ทุกภาพถูกถ่ายจากแอปที่รันจริง (`npm start`) ด้วยสคริปต์ใน `scripts/`
ที่ขับแอปผ่าน Chrome DevTools Protocol

## ก่อน / หลัง — ชุดเทียบตรงกัน

ชุดทดสอบเดียวกันคือ `กั๋ ปู่ สือ ที่ กำ สวัสดีครับ` (มีวรรณยุกต์บน สระบน สระล่าง ทัณฑฆาต ครบ)
เก็บได้ด้วย `node scripts/capture-thai-cli.mjs before|after`

| สถานการณ์ | ก่อน | หลัง |
|---|---|---|
| พิมพ์ไทยในช่อง prompt ของ `pi` | [`thai-cli/before/pi-tui-input.png`](thai-cli/before/pi-tui-input.png) | [`thai-cli/after/pi-tui-input.png`](thai-cli/after/pi-tui-input.png) |
| พิมพ์ไทยในช่อง prompt ของ `opencode` | [`thai-cli/before/opencode-tui-input.png`](thai-cli/before/opencode-tui-input.png) | [`thai-cli/after/opencode-tui-input.png`](thai-cli/after/opencode-tui-input.png) |
| ข้อความไทยที่แถวบนสุด + แถวล่างสุดของหน้าจอ | [`thai-cli/before/shell-edges.png`](thai-cli/before/shell-edges.png) | [`thai-cli/after/shell-edges.png`](thai-cli/after/shell-edges.png) |
| กรอบ ASCII ผสมภาษาไทย (`thai-test.ps1`) | [`thai-cli/before/shell-box.png`](thai-cli/before/shell-box.png) | [`thai-cli/after/shell-box.png`](thai-cli/after/shell-box.png) |

อาการที่เห็นได้ชัดในภาพ "ก่อน" ของทั้งสอง TUI: สระ/วรรณยุกต์ถูกผลักออกจากฐานของมัน
(`กำ` กลายเป็น `กํา`, `สวัสดีครับ` กลายเป็น `สวัสดีครัป`) และข้อความยาวเกินช่องก็ถูกตัดทิ้ง
หลังแก้แล้วสระ/วรรณยุกต์ทับฐานถูกตำแหน่ง และข้อความเต็มช่อง

## ผลกับเกณฑ์ความสำเร็จ

| เกณฑ์ | ผล | หลักฐาน |
|---|------|---------|
| 1. มีภาพหลักฐาน ก่อน/หลัง จากแอปจริง | ผ่าน | ตารางด้านบน (`thai-cli/before`, `thai-cli/after`) |
| 2. สระบน/ล่าง/ทัณฑฆาต ไม่ถูกตัดที่แถวบนสุด-ล่างสุด | ผ่าน | [`thai-cli/after/shell-edges.png`](thai-cli/after/shell-edges.png) — วัดได้ `topGap 0px`, `bottomGap +0.8px` (ค่าบวก = ยังมีที่ให้แถวสุดท้าย) |
| 3. สระ/วรรณยุกต์วางทับฐานถูกตำแหน่ง | ผ่าน | [`thai-cli/after/pi-tui-input.png`](thai-cli/after/pi-tui-input.png), [`thai-cli/after/opencode-tui-input.png`](thai-cli/after/opencode-tui-input.png) |
| 4. กรอบ/box-drawing ยังตรงกริด | ผ่าน | [`thai-cli/after/shell-box.png`](thai-cli/after/shell-box.png), [`pi/02-tui.png`](pi/02-tui.png), [`opencode/02-tui.png`](opencode/02-tui.png) |
| 5. ไม่มี mojibake จาก ConPTY codepage 437 | ผ่าน | เปิด `pi` / `opencode` จากตัวเลือกบนหน้าต่าง (main log: `[pty] spawn cmd.exe /c chcp 65001 >nul & pi`) แล้วพิมพ์ไทยได้ครบใน [`thai-cli/after/pi-tui-input.png`](thai-cli/after/pi-tui-input.png) |
| 6. `npm run evidence` ผ่านทุกสคริปต์ | ผ่าน | `check:thai-width` ผ่าน 15/15 บรรทัด คลาดเคลื่อนสูงสุด 0.011 คอลัมน์ (ดูหมายเหตุด้านล่าง) |

## ดูภาพไหนตรงกับเกณฑ์ความสำเร็จของโปรเจกต์เดิม

> โฟลเดอร์ `shell/`, `opencode/`, `pi/`, `resize/` เป็นภาพจากรอบก่อนแก้ (ยังใช้ canvas renderer)
> เก็บไว้เป็น baseline การรัน `npm run evidence` จะถ่ายชุดนี้ทับในที่เดิม
> ส่วนภาพเทียบก่อน/หลังของการแก้ครั้งนี้อยู่ที่ `thai-cli/` ด้านบน

| เกณฑ์ | ภาพหลักฐาน |
|---|---------|
| 1. `npm start` เปิดหน้าต่าง terminal เต็มจอ | ทุกภาพในโฟลเดอร์นี้ถ่ายจากแอปที่เปิดด้วย `npm start` (main log: `[pty] spawn powershell.exe cols=120 rows=35`) |
| 2. PowerShell พิมพ์/ลูกศร/Ctrl+C | [`shell/01-typed.png`](shell/01-typed.png), [`shell/02-arrowup.png`](shell/02-arrowup.png), [`shell/03-running.png`](shell/03-running.png), [`shell/04-ctrlc.png`](shell/04-ctrlc.png) |
| 3. ข้อความไทยจาก echo แสดงครบ ไม่มี tofu | [`shell/05-thai-alignment.png`](shell/05-thai-alignment.png) (กลุ่ม 1–3), [`opencode/01-run.png`](opencode/01-run.png), [`pi/01-print.png`](pi/01-print.png) |
| 4. `opencode` TUI + `opencode run` | [`opencode/01-run.png`](opencode/01-run.png), [`opencode/02-tui.png`](opencode/02-tui.png), [`opencode/03-command-palette.png`](opencode/03-command-palette.png), [`opencode/04-command-palette-arrowdown.png`](opencode/04-command-palette-arrowdown.png), [`opencode/05-tui-thai-input.png`](opencode/05-tui-thai-input.png) |
| 5. `pi` TUI + `pi -p` | [`pi/01-print.png`](pi/01-print.png), [`pi/02-tui.png`](pi/02-tui.png), [`pi/03-tui-thai-input.png`](pi/03-tui-thai-input.png) |
| 6. ไม่มี column drift | [`shell/05-thai-alignment.png`](shell/05-thai-alignment.png) + ตัวเลขจาก `npm run check:thai-width` (ผ่าน 15/15 บรรทัด) |
| 7. Resize แล้ว PTY/xterm ตรงกัน | [`resize/01-wide.png`](resize/01-wide.png), [`resize/02-narrow.png`](resize/02-narrow.png), [`resize/03-wide-again.png`](resize/03-wide-again.png) |
| 8. มี screenshot ครบ 4 กรณี | `shell/`, `opencode/`, `pi/` ครบทั้ง non-interactive และ TUI |

## หมายเหตุเรื่องตัวเลข column drift

`check:thai-width` เดิมอ่านพิกเซลจาก `<canvas>` ของ xterm แต่ `@xterm/xterm@6` ถอด
canvas renderer ออกแล้ว จึงเปลี่ยนไปวัดจาก `getBoundingClientRect()` ของ `<span>` ที่
DOM renderer วางจริง เทียบกับ cell metrics ของ xterm

วิธีวัดนี้รวม `letter-spacing` ท้ายบรรทัดด้วย (การวัดหมึกตัวอักษรแบบเดิมไม่รวม)
จึงมีค่าคงทน ~0.062 คอลัมน์ที่เกิดกับทั้งบรรทัด ASCII โดยสคริปต์ใช้บรรทัด ASCII เป็น
จุดอ้างอิงแล้วหักออก เหลือส่วนที่ภาษาไทยทำให้เกินซึ่งสูงสุด **0.011 คอลัมน์**
(เกิดจากความกว้าง glyph ที่เป็นทศนิยม มองไม่เห็น และเล็กกว่าเกณฑ์ 0.05 คอลัมน์)

## สรุปผล

- ตรวจ column drift แบบตัวเลข (`npm run check:thai-width`) ผ่าน 15/15 บรรทัด
- ทุกสถานการณ์ที่ทดสอบ **ไม่มี error ใน DevTools console และ main process log**
- ภาษาไทยจาก `Write-Host`, `opencode run`, `pi -p` และจากช่องพิมพ์ของทั้งสอง TUI
  แสดงผลครบถ้วน ไม่มี tofu box และสระ/วรรณยุกต์ไม่ถูกตัด
- การเปรียบเทียบฟอนต์ → [`fonts/README.md`](fonts/README.md)

## ข้อจำกัดที่ยังแก้ไม่ได้

1. **รอย 1px ต่อบรรทัดใน ASCII art** — `cell height` ที่ Chromium วัดได้เป็นเลขทศนิยม
   (`18.4118px`) ทำให้แต่ละแถวถูก rasterize คนละตำแหน่งทศนิยม รอยต่อจึงเห็นเป็นเส้น
   เห็นได้ชัดในโลโก้ `opencode` ที่ใช้ block element (`█▀▄`)
   ทางแก้คือเปลี่ยนกลับไปใช้ canvas/webgl renderer ซึ่งแลกกับความถูกต้องของ
   การจัดรูปแบบภาษาไทยโดยตรง — **เลือกความถูกของภาษาไทยไว้**
2. **ผลขึ้นกับฟอนต์ที่ติดตั้งในแต่ละเครื่อง** — ใช้ฟอนต์ระบบ (ไม่ฝังมาในโปรเจกต์)
   จึงต้องมี `Leelawadee UI` หรือฟอนต์ไทยอื่นในเครื่อง
3. **ช่องว่างรอบสระนำหน้า** — สระนำหน้าภาษาไทย (`เ`, `แ`) เป็นอักขระที่กินคอลัมน์เอง
   การวางจึงต้องเว้นจากพยัญชนะที่ตามมา ซึ่งเป็นข้อจำกัดของการแบ่งเป็นช่องของ terminal
   ทุกตัว (รวมถึง `poc-terminal-grill` ดูจากภาพเทียบข้าง ๆ)
