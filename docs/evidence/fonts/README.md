# ผลการเปรียบเทียบฟอนต์สำหรับภาษาไทย

ทดสอบด้วยข้อความชุดเดียวกัน (`scripts/thai-test.ps1`) ทั้ง 4 ตัว บนแอปจริง
รันซ้ำได้ด้วย `node scripts/font-lab.mjs` (สคริปต์จะสลับ `--terminal-font-family` ใน
`src/renderer/style.css`, build ใหม่ แล้วถ่ายภาพ)

ไทยเป็นฟอนต์ **proportional** ไม่ใช่ monospace ตัวไหนเป็นตัวแรกจึงไม่มีผลกับไทย
Chromium จะ fallback ต่ออัตโนมัติตาม codepoint สิ่งที่ต่างกันจริงคือ *ตัวที่ fallback ไปใช้*
และผลกับ ASCII art / box-drawing ของ TUI

| # | ฟอนต์ | ผลจากการมองจริง | ภาพ |
|---|-------|----------------|-----|
| a | **Cascadia Mono → Leelawadee UI** | ไทยอ่านออก สระ/วรรณยุกต์ทับฐานถูกตำแหน่ง กรอบ `-` ต่อกันสนิท | [a-cascadia-leelawadee.png](a-cascadia-leelawadee.png) / [ซูม](a-cascadia-leelawadee-zoom.png) |
| b | JetBrains Mono → Leelawadee UI | อ่านไทยได้ ตัวเรียวกว่า Cascadia | [b-jetbrains-leelawadee.png](b-jetbrains-leelawadee.png) / [ซูม](b-jetbrains-leelawadee-zoom.png) |
| c | Consolas → Leelawadee UI | อ่านไทยได้ เข้มและกว้างกว่า | [c-consolas-leelawadee.png](c-consolas-leelawadee.png) / [ซูม](c-consolas-leelawadee-zoom.png) |
| d | Leelawadee UI → Cascadia Mono | ไทยกินพื้นที่กว้าง อักษรละติน/เครื่องหมายถูกเว้นห่างจน ASCII art แตกกริด | [d-leelawadee-cascadia.png](d-leelawadee-cascadia.png) / [ซูม](d-leelawadee-cascadia-zoom.png) |

## ข้อสรุป

เลือก **a — `'Cascadia Mono', 'Leelawadee UI', monospace`** เพราะ:

1. `Cascadia Mono` (monospace, มากับ Windows) รับผิดชอบละติน ASCII และ box-drawing
   จึงไม่หลุดกริด เหลือแต่ codepoint ที่ Cascadia ไม่มี (คือภาษาไทย) ที่ fallback ไป
   `Leelawadee UI` (ฟอนต์ไทยที่ Windows มาพร้อมเครื่อง)
2. สลับลำดับเป็น d จะเห็นชัดว่า ASCII art ของ `opencode` เสียทันที ดังนั้นลำดับสำคัญ
3. ผลขึ้นกับเครื่อง — ถ้าไม่มี `Leelawadee UI` ให้เปลี่ยนเป็น `'Noto Sans Thai'` หรือ `'Tahoma'`

## หมายเหตุ

- ก่อนหน้านี้โปรเจกต์ฝัง webfont (`Noto Sans Mono` + `Noto Sans Thai` ผ่าน `@fontsource/*`)
  มาใช้ แต่ตอนนี้เลิกฝังแล้วเพราะผลของมันแย่กว่าเมื่อเทียบกับ `Leelawadee UI`
  ภาพชุดเดิม `*-noto.png` / `*-sarabun.png` / `*-plex.png` เก็บไว้เป็นภาพจากรอบนั้น
  ไม่ได้ใช้อ้างอิงแล้ว
- ตัว renderer ที่ใช้อยู่ตอนนี้คือ DOM renderer ของ `@xterm/xterm@6` ซึ่งให้เบราว์เซอร์จัดรูปแบบ
  ภาษาไทยเอง (GPOS) สระ/วรรณยุกต์จึงวางทับฐานถูกตำแหน่ง ไม่ต้องพึ่งฟอนต์พิเศษ
