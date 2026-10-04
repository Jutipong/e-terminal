import { launchApp, sleep } from './cdp.mjs';

const app = await launchApp();
await app.waitForPrompt();
await sleep(500);

await app.type('opencode');
await app.enter();
await sleep(12_000);
await app.shot('docs/evidence/opencode/02-tui.png');

// เปิด command palette (ctrl+p) แล้วใช้ลูกศรเลื่อนรายการ
await app.press('p', { code: 'KeyP', keyCode: 80, modifiers: 2 });
await sleep(2000);
await app.shot('docs/evidence/opencode/03-command-palette.png');

for (let i = 0; i < 3; i++) {
  await app.press('ArrowDown', { code: 'ArrowDown', keyCode: 40 });
  await sleep(500);
}
await app.shot('docs/evidence/opencode/04-command-palette-arrowdown.png');

// ปิด palette แล้วพิมพ์ภาษาไทยลงในช่อง prompt ของ TUI (ยังไม่ส่ง เพื่อไม่เผาเครดิต)
await app.press('Escape', { code: 'Escape', keyCode: 27 });
await sleep(1000);
await app.type('ทดสอบภาษาไทยในกล่องพิมพ์ของ opencode');
await sleep(1500);
await app.shot('docs/evidence/opencode/05-tui-thai-input.png');

console.log('--- เนื้อหาบนหน้าจอ ---');
console.log(await app.visibleText());
console.log('console errors:', JSON.stringify(app.consoleErrors));
console.log(app.logs.join(''));
await app.close();
