import { launchApp, sleep } from './cdp.mjs';

const app = await launchApp();
await app.waitForPrompt();
await sleep(500);

// 1. พิมพ์คำสั่งธรรมดา
await app.type('echo hello-from-pty');
await app.enter();
await sleep(1200);
await app.shot('docs/evidence/shell/01-typed.png');

// 2. ลูกศรขึ้น = เรียก command history
await app.press('ArrowUp', { code: 'ArrowUp', keyCode: 38 });
await sleep(800);
await app.shot('docs/evidence/shell/02-arrowup.png');

// ล้างบรรทัดที่เรียกกลับมาด้วย Ctrl+C เพื่อเริ่มขั้นต่อไปแบบสะอาด
await app.press('c', { code: 'KeyC', keyCode: 67, modifiers: 2 });
await sleep(1000);

// 3. คำสั่งที่ยังไม่จบ = ต้องกด Ctrl+C เพื่อหยุด
await app.type('ping -t 127.0.0.1');
await app.enter();
await sleep(3000);
await app.shot('docs/evidence/shell/03-running.png');

await app.press('c', { code: 'KeyC', keyCode: 67, modifiers: 2 });
await sleep(1500);
await app.shot('docs/evidence/shell/04-ctrlc.png');

console.log('console errors:', JSON.stringify(app.consoleErrors));
console.log(app.logs.join(''));
await app.close();
