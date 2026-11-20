#!/usr/bin/env node
/**
 * 标准打包流水线：将「测试短片-按日期发布」中的 (.mp4 + .txt + 三比例封面)
 * 自动转换为「麦田发布助手」标准工程目录（Y:\AI励志\最终定稿\麦田工程\<MMDD-名称>\）
 *
 * 用法：
 *   node "Y:\AI励志\最终定稿\麦田工程\build-projects.mjs" [--from 18] [--force]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const force = args.includes('--force');
const includePast = args.includes('--all');
const fromIdx = args.indexOf('--from');
const fromDay = fromIdx >= 0 ? +args[fromIdx + 1] : 18;

const SRC = process.env.MAITIAN_SRC || 'Y:\\AI励志\\最终定稿\\测试短片-按日期发布';
const DST = process.env.MAITIAN_DST || 'Y:\\AI励志\\最终定稿\\麦田工程';
const PUB = process.env.MAITIAN_PUB || path.join(process.env.USERPROFILE || 'C:\\Users\\win11', 'maitian', 'mdldm-maitian-publisher');

// 自动探测 ffmpeg（优先系统 PATH，回退 Python imageio_ffmpeg）
function findFfmpeg() {
  try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return 'ffmpeg'; } catch {}
  try {
    const py = execFileSync('python', ['-c', 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' }).trim();
    if (py && fs.existsSync(py)) return py;
  } catch {}
  const fallback = 'C:\\Users\\win11\\AppData\\Local\\Programs\\Python\\Python312\\Lib\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';
  if (fs.existsSync(fallback)) return fallback;
  throw new Error('未找到 ffmpeg，请安装 ffmpeg 或 pip install imageio-ffmpeg');
}
const FF = findFfmpeg();

const items = fs.readdirSync(SRC)
  .filter(n => n.endsWith('.mp4'))
  .map(n => n.slice(0, -4))
  .filter(n => {
    const m = n.match(/^(\d{2})月(\d{2})日/);
    if (!m) return false;
    return +m[2] >= fromDay;
  })
  .sort();

const trunc = (s, max) => [...s].slice(0, max).join('');
const cleanShort = (s) => s.replace(/[，「」『』]/g, ' ').replace(/\s+/g, ' ').trim();

const fullCopyMap = {
  '第四章正片-自我超越': 'Y:\\AI励志\\最终定稿\\第四章-自我超越\\发布文案.txt',
  '第五章正片-挣脱': 'Y:\\AI励志\\最终定稿\\第五章-挣脱\\发布文案.txt',
  '第六章正片-清醒': 'Y:\\AI励志\\最终定稿\\第六章-清醒\\发布文案.txt',
};

const parseFull = (txt) => {
  const getSec = (name) => {
    const re = new RegExp(`【${name}】\\r?\\n([\\s\\S]*?)(?=\\r?\\n={10,}|$)`);
    const m = txt.match(re);
    return m ? m[1] : '';
  };
  const dy = getSec('抖音');
  const sph = getSec('视频号');
  const titleM = dy.match(/作品标题[^：]*：\s*\r?\n?([^\r\n]+)/);
  const title = titleM ? titleM[1].trim() : '';
  const descM = sph.match(/描述：\s*\r?\n([\s\S]*?)(?=\r?\n话题：|\r?\n$)/);
  const desc = descM ? descM[1].replace(/\r?\n\s*#\S+[^\r\n]*/g, '').trim() : '';
  const topicM = (sph + '\n' + dy).match(/(#[^\r\n]+)/);
  const topics = topicM ? topicM[1].trim() : '#红围巾光痕 #原创动画 #自我成长 #人生感悟';
  return { title, desc, topics };
};

let okCount = 0;
for (const base of items) {
  const m = base.match(/^(\d{2})月(\d{2})日[^-]+-(\d{2})点(\d{2})-(.+)$/);
  if (!m) continue;
  const [, month, dd, hh, mm, label] = m;
  const epNum = `${dd}${hh}`;
  const schedule = `2026-${month}-${dd} ${hh}:${mm}`;
  if (!includePast && Date.parse(`${schedule.replace(' ', 'T')}:00+08:00`) < Date.now() + 2 * 3600e3) continue;
  const slug = (dd === '18' && hh === '12' && label.includes('回望来时路')) ? '1118-回望来时路' : `${dd}${hh}-${label}`;
  const outDir = path.join(DST, slug);
  fs.mkdirSync(path.join(outDir, '封面'), { recursive: true });

  // 1. 视频无损 faststart 封装（小红书/抖音必做）
  const mp4In = path.join(SRC, `${base}.mp4`);
  const mp4Out = path.join(outDir, '成片.mp4');
  if (force || !fs.existsSync(mp4Out)) {
    execFileSync(FF, ['-v', 'error', '-y', '-i', mp4In, '-c', 'copy', '-movflags', '+faststart', mp4Out], { stdio: 'inherit' });
  }

  // 2. 三比例封面转换/复制（3:4、4:3、9:16）
  for (const [k, suf, ext] of [['3x4', '-封面3x4.jpg', 'png'], ['4x3', '-封面4x3.jpg', 'png'], ['9x16', '-封面9x16.jpg', 'jpg']]) {
    const jpg = path.join(SRC, `${base}${suf}`);
    const target = path.join(outDir, '封面', `cover-${k}.${ext}`);
    if (fs.existsSync(jpg) && (force || !fs.existsSync(target))) {
      if (ext === 'jpg') fs.copyFileSync(jpg, target);
      else execFileSync(FF, ['-v', 'error', '-y', '-i', jpg, target], { stdio: 'inherit' });
    }
  }

  // 3. 解析 .txt 文案并生成 发布素材.md
  const txtPath = path.join(SRC, `${base}.txt`);
  const txt = fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf8') : '';
  let title = '', shortTitle = '', desc = '', topics = '';

  const stM = txt.match(/视频号短标题[^：]*：\s*([^\r\n]+)/);
  if (stM) shortTitle = stM[1].trim();

  const fullKey = Object.keys(fullCopyMap).find(k => label.includes(k));
  if (fullKey && fs.existsSync(fullCopyMap[fullKey])) {
    const fc = parseFull(fs.readFileSync(fullCopyMap[fullKey], 'utf8'));
    title = fc.title || shortTitle || label;
    desc = fc.desc;
    topics = fc.topics;
  } else {
    const tM = txt.match(/^标题：\s*([^\r\n]+)/m);
    title = tM ? tM[1].trim() : label;
    const dM = txt.match(/^描述：\s*\r?\n([\s\S]*?)(?=\r?\n(?:抖音版|话题|置顶评论|——)|$)/m);
    desc = dM ? dM[1].replace(/\r?\n\s*#\S+[^\r\n]*/g, '').trim() : title;
    const tpM = txt.match(/^话题：\s*([^\r\n]+)/m);
    topics = tpM ? tpM[1].trim() : '#红围巾光痕 #原创动画 #自我成长 #人生感悟';
  }

  if (!shortTitle) shortTitle = cleanShort(title);
  if ([...shortTitle].length > 16) shortTitle = trunc(shortTitle, 16);
  if ([...shortTitle].length < 6) shortTitle = shortTitle.padEnd(6, ' ');

  const xhsTitle = trunc(title, 20);
  const dyTitle = trunc(title, 30);
  const safeDesc = desc
    .replace(/完整版\s*见主页/g, '完整版在合集')
    .replace(/见主页/g, '关注看更多');

  const md = `# 红围巾光痕 · ${label}

> 序号：${epNum}
> 定时发布：${schedule}
> 成品视频：${mp4Out}

## 四、小红书
**标题：**
${xhsTitle}
**正文：**
原创角色《红围巾光痕》
${safeDesc}
${topics}

## 五、抖音
**标题：**
${dyTitle}
**正文：**
${safeDesc}
${topics}

## 六、视频号
**短标题：**
${shortTitle}
**描述：**
${safeDesc}
${topics}

## 快手
**正文：**
${title}
${desc}
${topics}
`;

  fs.writeFileSync(path.join(outDir, '发布素材.md'), md, 'utf8');

  // 4. 调用 make-publish.mjs 生成 publish.json 并用 validate.mjs 校验
  execFileSync('node', [path.join(PUB, 'tools', 'make-publish.mjs'), path.join(outDir, '发布素材.md'), outDir, '--require', '红围巾光痕'], { stdio: 'pipe' });
  execFileSync('node', [path.join(PUB, 'tools', 'validate.mjs'), outDir], { stdio: 'pipe' });
  console.log(`✅ ${slug} (${schedule})`);
  okCount++;
}

console.log(`\n全部完成：共生成并校验通过 ${okCount} 个麦田工程（目录：${DST}）`);
