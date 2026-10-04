# หลักฐานการทดสอบภาษาไทย

ทุกภาพถูกถ่ายจากแอปที่รันจริง (`npm start`) ด้วยสคริปต์ใน `scripts/`
ที่ขับแอปผ่าน Chrome DevTools Protocol

## ดูภาพไหนตรงกับเกณฑ์ความสำเร็จข้อไหน

| เกณฑ์ | ภาพหลักฐาน |
|-------|-----------|
| 1. `npm start` เปิดหน้าต่าง terminal เต็มจอ | ทุกภาพในโฟลเดอร์นี้ถ่ายจากแอปที่เปิดด้วย `npm start` (main log: `[pty] spawn powershell.exe cols=121 rows=31`) |
| 2. PowerShell พิมพ์/ลูกศร/Ctrl+C | [`shell/01-typed.png`](shell/01-typed.png), [`shell/02-arrowup.png`](shell/02-arrowup.png), [`shell/03-running.png`](shell/03-running.png), [`shell/04-ctrlc.png`](shell/04-ctrlc.png) |
| 3. ข้อความไทยจาก echo แสดงครบ ไม่มี tofu | [`shell/05-thai-alignment.png`](shell/05-thai-alignment.png) (กลุ่ม 1–3), [`opencode/01-run.png`](opencode/01-run.png), [`pi/01-print.png`](pi/01-print.png) |
| 4. `opencode` TUI + `opencode run` | [`opencode/01-run.png`](opencode/01-run.png), [`opencode/02-tui.png`](opencode/02-tui.png), [`opencode/03-command-palette.png`](opencode/03-command-palette.png), [`opencode/04-command-palette-arrowdown.png`](opencode/04-command-palette-arrowdown.png), [`opencode/05-tui-thai-input.png`](opencode/05-tui-thai-input.png) |
| 5. `pi` TUI + `pi -p` | [`pi/01-print.png`](pi/01-print.png), [`pi/02-tui.png`](pi/02-tui.png), [`pi/03-tui-thai-input.png`](pi/03-tui-thai-input.png) |
| 6. ไม่มี column drift | [`shell/05-thai-alignment.png`](shell/05-thai-alignment.png) + ตัวเลขจาก `npm run check:thai-width` (ผ่าน 15/15 บรรทัด, สูงสุด 0.000 คอลัมน์) |
| 7. Resize แล้ว PTY/xterm ตรงกัน | [`resize/01-wide.png`](resize/01-wide.png), [`resize/02-narrow.png`](resize/02-narrow.png), [`resize/03-wide-again.png`](resize/03-wide-again.png) |
| 8. มี screenshot ครบ 4 กรณี | `shell/`, `opencode/`, `pi/` ครบทั้ง non-interactive และ TUI |

## สรุปผล

- ตรวจ column drift แบบตัวเลข (`npm run check:thai-width`) อ่านพิกเซลจาก canvas ของ
  xterm แล้วเทียบกับจำนวนคอลัมน์ที่คำนวณจากข้อความใน buffer
  → **ผ่านทุกบรรทัด คลาดเคลื่อนสูงสุด 0.000 คอลัมน์**
- ทุกสถานการณ์ที่ทดสอบ **ไม่มี error ใน DevTools console และ main process log**
- ภาษาไทยจาก `Write-Host`, `opencode run`, `pi -p` และจากช่องพิมพ์ของทั้งสอง TUI
  แสดงผลครบถ้วน ไม่มี tofu box และสระ/วรรณยุกต์ไม่ถูกตัด
- การเปรียบเทียบฟอนต์ → [`fonts/README.md`](fonts/README.md)
