import { launchApp, sleep } from './cdp.mjs';

const app = await launchApp();
await app.waitForPrompt();
await sleep(500);

// ใช้ชุดข้อความไทยเพื่อให้เห็นผลของการ reflow ชัดที่สุด
await app.type('powershell -NoProfile -ExecutionPolicy Bypass -File scripts/thai-test.ps1');
await app.enter();
await sleep(4000);
await app.shot('docs/evidence/resize/01-wide.png');

await app.setViewport(680, 420);
await sleep(2500);
await app.shot('docs/evidence/resize/02-narrow.png');

await app.setViewport(1400, 900);
await sleep(2500);
await app.shot('docs/evidence/resize/03-wide-again.png');

console.log('console errors:', JSON.stringify(app.consoleErrors));
console.log(app.logs.join(''));
await app.close();
