# ผลการเปรียบเทียบฟอนต์สำหรับภาษาไทย

ทดสอบด้วยข้อความชุดเดียวกัน (`scripts/thai-test.ps1`) ทั้ง 4 ตัว บนแอปจริง
รันซ้ำได้ด้วย `node scripts/font-lab.mjs` (สคริปต์จะสลับ `--terminal-font-family` ใน
`src/renderer/style.css`, build ใหม่ แล้วถ่ายภาพ)

| # | ฟอนต์ | ผลจากการมองจริง | ภาพ |
|---|-------|----------------|-----|
| a | Cascadia Mono + Noto Sans Thai | สระ/วรรณยุกต์ซ้อนถูกตำแหน่ง ไม่ซ้อนกัน ตัวเลขไทย ๐-๙ ปกติ | [a-cascadia-noto.png](a-cascadia-noto.png) / [ซูม](a-cascadia-noto-zoom.png) |
| b | Cascadia Mono + Sarabun | ถูกต้องเช่นกัน รูปทรงตัวอักษรหนาแน่นกว่า Noto | [b-cascadia-sarabun.png](b-cascadia-sarabun.png) / [ซูม](b-cascadia-sarabun-zoom.png) |
| c | Cascadia Mono + IBM Plex Sans Thai | ถูกต้อง แต่ปลายสระ/หัวอักษรบางกว่า Noto เล็กน้อย | [c-cascadia-plex.png](c-cascadia-plex.png) / [ซูม](c-cascadia-plex-zoom.png) |
| d | **Noto Sans Mono + Noto Sans Thai** | **ถูกต้องเหมือน a แต่เป็นฟอนต์ที่ฝังมาทั้งสองตัว** | [d-notomono-noto.png](d-notomono-noto.png) / [ซูม](d-notomono-noto-zoom.png) |

## ข้อสรุป

เลือก **d — Noto Sans Mono + Noto Sans Thai** เพราะ:

1. คุณภาพการเรนเดอร์สระ/วรรณยุกต์เท่ากับตัว a (ซึ่งผ่านเกณฑ์ได้ดีที่สุด)
2. **ฝังฟอนต์มาทั้งคู่** จึงได้ผลเหมือนกันทุกเครื่อง ไม่ต้องพึ่งฟอนต์ระบบ
   (ตัว a ใช้ Cascadia Mono ที่ติดมากับ Windows เครื่องนี้เท่านั้น)
3. ตัวเลขไทย ๐-๙ และอักษรไทยทุกตัวมี glyph ครบ ไม่มี tofu

## ปัญหาที่เจอระหว่างทาง (สำคัญมาก)

1. **ต้องใช้ canvas renderer** — DOM renderer ของ xterm.js คูณ `letter-spacing`
   ตามความกว้างจริงของ glyph เพื่อยัดลงช่อง ซึ่งชดเชยไม่ได้พอดีสำหรับฟอนต์ไทยที่ไม่ monospace
   ทำให้เกิด column drift สูงสุด ~1.2 คอลัมน์ต่อบรรทัด (`@xterm/addon-canvas`)
2. **ต้องรอให้ฟอนต์เว็บโหลดเสร็จก่อนสร้าง `Terminal`** — xterm.js วัดความกว้างตัวอักษร
   ครั้งเดียวแล้วแคชไว้ ถ้าวัดก่อนฟอนต์มา ค่าจะผิด
3. **`<link rel="stylesheet">` ของ Vite อยู่หลัง `<script type="module">`** ทำให้สคริปต์
   รันก่อน `@font-face` ถูกลงทะเบียน ต้องรอให้ stylesheet โหลดเสร็จก่อนเรียก `document.fonts.load()`
4. **`getComputedStyle` คืนชื่อฟอนต์ที่อ้างด้วยเครื่องหมายคำพูด** ต้องรองรับทั้ง `'` และ `"`
