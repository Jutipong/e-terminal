import { launchApp, sleep } from './cdp.mjs';

const app = await launchApp();
await app.waitForPrompt();
await sleep(500);

await app.type('pi');
await app.enter();
await sleep(15_000);
await app.shot('docs/evidence/pi/02-tui.png');

// พิมพ์ภาษาไทยลงในช่อง prompt ของ TUI (ยังไม่ส่ง เพื่อไม่เผาเครดิต)
await app.type('ทดสอบภาษาไทยในกล่องพิมพ์ของ pi');
await sleep(1500);
await app.shot('docs/evidence/pi/03-tui-thai-input.png');

console.log('--- เนื้อหาบนหน้าจอ ---');
console.log(await app.visibleText());
console.log('console errors:', JSON.stringify(app.consoleErrors));
console.log(app.logs.join(''));
await app.close();
