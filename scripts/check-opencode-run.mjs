import { launchApp, sleep } from './cdp.mjs';

const COMMAND = 'opencode run (Get-Content -Raw -Encoding UTF8 scripts/prompts/opencode-thai.txt)';
const PROMPT = 'PS D:\\code\\poc-terminal>';

const app = await launchApp();
await app.waitForPrompt();
await sleep(500);

const countPrompts = async () => (await app.visibleText()).split(PROMPT).length - 1;
const before = await countPrompts();

await app.type(COMMAND);
await app.enter();

const deadline = Date.now() + 240_000;
while ((await countPrompts()) <= before) {
  if (Date.now() > deadline) {
    throw new Error('opencode run ไม่จบภายใน 240 วินาที');
  }
  await sleep(1000);
}
await sleep(1500);

console.log('--- เนื้อหาบนหน้าจอ ---');
console.log(await app.visibleText());
await app.shot('docs/evidence/opencode/01-run.png');
console.log('console errors:', JSON.stringify(app.consoleErrors));
console.log(app.logs.join(''));
await app.close();
