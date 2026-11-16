import { evaluate, setFiles, sleep, waitFor, insertText, focusEnd, typeLines, pressKey, click, byText } from '../cdp.js';

const EDITOR = `document.querySelector('#work-description-edit')`;

async function schedule(ctx) {
  const T = ctx.tabId, s = ctx.schedule;
  const ok = await evaluate(T, `(()=>{
    const el = [...document.querySelectorAll('label,span')].find(e => e.textContent.trim() === '定时发布');
    if (!el) return false;
    el.click();
    return true;
  })()`);
  const IN = `document.querySelector('.ant-picker-input input, input[placeholder*="时间"], input[placeholder*="日期"]')`;
  if (!ok || !await waitFor(T, `!!${IN}`, 5000)) { ctx.note('快手未找到定时输入框，请在页面手动核对定时'); return; }
  await evaluate(T, `(()=>{const i=${IN}; i.focus(); i.select(); return 1})()`);
  await insertText(T, s.text); await sleep(500);
  await pressKey(T, 'Enter'); await sleep(400);
  await pressKey(T, 'Escape'); await sleep(400);
  await evaluate(T, `${IN}.blur()`); await sleep(400);
  const got = await evaluate(T, `${IN}.value`);
  if (got && got.includes(s.text.slice(0, 10))) ctx.log(`定时发布：${got}`);
  else ctx.note(`定时待核对：页面上是「${got || '空'}」，目标「${s.text}」`);
}

export default {
  id: 'kuaishou',
  name: '快手',
  url: 'https://cp.kuaishou.com/article/publish/video',
  ready: `!!document.querySelector('input[type=file]')`,

  async fill(ctx) {
    const { tabId: T, p } = ctx;
    await setFiles(T, `document.querySelector('input[type=file]')`, [ctx.video]);
    ctx.log('视频开始上传');
    if (!await waitFor(T, `!!${EDITOR}`, 30000)) throw new Error('上传后没有出现快手作品表单');
    await sleep(1500);

    await focusEnd(T, EDITOR);
    await typeLines(T, p.body);
    if (p.topics && p.topics.length) {
      await pressKey(T, 'Enter');
      for (const t of p.topics) {
        await insertText(T, '#' + t + ' ');
        await sleep(300);
      }
      ctx.log(`话题：${p.topics.join('、')}`);
    }
    ctx.log(`描述：${p.body.length} 字`);
    if (ctx.schedule) await schedule(ctx);
  },

  uploadDone: `(()=>{const t=document.body.innerText; return !t.includes('上传中') && !t.includes('取消上传');})()`,

  async afterUpload(ctx) {
    const ratio = ctx.cover('9x16') ? '9:16' : '3:4';
    const cover = ctx.cover('9x16') || ctx.cover('3x4');
    if (!cover) return;
    const T = ctx.tabId;
    await click(T, `document.querySelector('[class*=cover-full-editor]') || ${byText('封面设置')}`);
    await sleep(1000);
    await click(T, byText('上传封面'));
    await sleep(1000);
    const IMG = `[...document.querySelectorAll('input[type=file]')].filter(i => /image/.test(i.accept || '')).slice(-1)[0]`;
    if (!await waitFor(T, `!!${IMG}`, 10000)) { ctx.note(`快手未找到封面上传框（${ratio}），请页面手动核对`); return; }
    await setFiles(T, IMG, [cover]);
    await sleep(3500);
    if (!await click(T, byText('确认'))) { ctx.note(`快手封面（${ratio}）已上传，请在弹窗点「确认」`); return; }
    await sleep(2000);
    ctx.log(`封面：${ratio} 已上传并确认`);
  },
};
