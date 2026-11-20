# 麦田发布助手（Windows 专用适配版 · Chrome 插件）

> **致 AI Agent（Antigravity / Claude Code / Codex / Cursor）与使用者**：
> 本仓库是 **Windows 10/11 专用修改版**（基于原版 macOS 项目深度适配并新增 **快手** 平台与最优封面策略）。
> - **插件仓库（本仓库）**：`https://github.com/arb989822/mdldm-maitian-publisher-win`
> - **配套麦田中控仓库（Windows 版）**：`https://github.com/arb989822/mdldm-maitian-win`
> - ⚠️ **切勿克隆原版 `CzzzzzzJ` 仓库或使用原版 `driver: "direct"` / `/Volumes/...` 配置**，否则在 Windows 下会出现路径报错、缺少快手、封面比例错位等问题。

---

## 一、Windows 版核心改动（相比原版）

1. **Windows 路径与盘符全面适配**：
   - `video.js`：支持 Windows 盘符路径（`C:\...`、`Y:\...`、`\\NAS\...`），且无论「选择」点的是父目录还是单期子目录，均自动对齐层级、去重重叠目录名。
   - `lib/publish.js`：`abs()` 按 Windows 反斜杠 `\` 规范拼接文件路径；登录预检改为前台激活标签页（`active: true`）+ `120s` 超时，彻底解决 Chrome 后台标签页节流导致抖音超时的问题。
   - `tools/make-publish.mjs`、`tools/validate.mjs`：Windows 反斜杠路径统一归一化为 `/`，动态 `import()` 改用 `pathToFileURL`，修复 Windows 下识别不到封面和扩展钩子的问题。
2. **新增「快手（`kuaishou`）」全自动填写适配器**：
   - 新增 `lib/platforms/kuaishou.js`、`lib/platforms/extra.js`、`lib/platforms/extra-specs.js`、`tools/make-publish.local.mjs`。
   - 支持快手视频上传、描述+话题自动输入（支持第一行提问标题）、定时发布、以及 **`9:16` 竖版封面**自动打开「封面设置 → 上传封面 → 确认」。
3. **各平台最优封面自动选择与防错位**：
   - **小红书（`xhs`）**：自动选 **`3:4`**（`cover-3x4.png` / `.jpg`），自动裁剪 `3:4` 并校验评估通过。
   - **抖音（`douyin`）**：自动双配 **`4:3`（横封面）+ `3:4`（竖封面）**；修复了竖屏视频默认停在「竖封面」页签导致 `4:3` 覆盖 `3:4`、缺失横封面的 Bug（现显式先切 `设置横封面` 传 `4:3`，再切 `设置竖封面` 传 `3:4`）。
   - **视频号（`channels`）**：自动双配 **`3:4`（个人主页卡片）+ `4:3`（分享卡片）**，`3:4` 不重复上传，`4:3` 找不到编辑按钮时温和提示不标红异常；修复了微信 `weui-desktop-picker` 时间面板未展开导致定时停在默认 `04:00` 的 Bug（现通过 `focus() + click()` + `scrollIntoView()` 精准点选时、分）。
   - **快手（`kuaishou`）**：优先自动选 **`9:16`**（`cover-9x16.jpg` / `.png`），无 `9:16` 时自动回退 `3:4`。
4. **安全加固**：
   - `tools/bridge-server.mjs` 增加 `/cmd` 仅允许插件后台调用的校验，阻断网页跨站调用。

---

## 二、AI Agent 一键安装与配置流程（Windows 10/11）

### 第 1 步：前置环境检查
确保本机已安装：
- **Node.js `>= 22.5`**（必须，用到内置 `node:sqlite`）
- **Git**、**Google Chrome**
- **ffmpeg**（用于给视频做 `-movflags +faststart`，否则小红书会报「检测到视频文件无视频流信息」）

### 第 2 步：克隆两个 Windows 专用仓库到 `%USERPROFILE%\maitian`
**注意：文件夹名保持 `mdldm-maitian` 和 `mdldm-maitian-publisher`，但克隆源必须是 `arb989822` 的 `-win` 仓库！**

```powershell
$dir = "$env:USERPROFILE\maitian"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Set-Location $dir
git clone https://github.com/arb989822/mdldm-maitian-win.git mdldm-maitian
git clone https://github.com/arb989822/mdldm-maitian-publisher-win.git mdldm-maitian-publisher
```

### 第 3 步：在 Chrome 加载本插件
1. 打开 Chrome 地址栏输入 `chrome://extensions`
2. 打开右上角 **「开发者模式」** → 点击左上角 **「加载已解压的扩展程序」**
3. 选择目录：`C:\Users\<你的用户名>\maitian\mdldm-maitian-publisher`
4. 复制扩展卡片上的 **32 位扩展 ID**（例如 `kabokggfkpikbgikhclnhofllleeboce`）

### 第 4 步：初始化麦田中控配置（`config.json`）
在 `C:\Users\<你的用户名>\maitian\mdldm-maitian` 下运行初始化脚本：

```powershell
cd "$env:USERPROFILE\maitian\mdldm-maitian"
powershell -ExecutionPolicy Bypass -File scripts/install-win.ps1
```

然后打开生成的 `config.json`，确认以下关键字段（**注意必须用 `"driver": "plugin"`**）：
```json
{
  "name": "麦田",
  "pluginDir": "C:\\Users\\<你的用户名>\\maitian\\mdldm-maitian-publisher",
  "extensionId": "<第3步复制的32位Chrome扩展ID>",
  "bridge": "http://127.0.0.1:8765",
  "driver": "plugin",
  "chromePort": 9333,
  "chromeProfile": "C:\\Users\\<你的用户名>\\maitian\\mdldm-maitian\\chrome-profile",
  "rootPath": "<你的发布工程根目录，如 Y:\\AI励志\\最终定稿\\麦田工程>",
  "batches": [["bilibili", "douyin"], ["xhs", "channels", "kuaishou"], ["youtube"], ["instagram"]],
  "auto": ["zsz", "youtube", "instagram"],
  "manual": ["bilibili", "douyin", "xhs", "channels", "kuaishou"],
  "keepAlive": ["channels"],
  "keepAliveMinutes": 60,
  "sampleHours": 6,
  "web": { "port": 8787, "key": "<自动生成的随机口令>" }
}
```

---

## 三、发布工程打包标准（Agent 打包规范）

每个发布工程放在 `<rootPath>\<期数目录>\` 下，结构如下：

```text
<rootPath>\<期数目录>\
  成片.mp4                 ← 必须经过 ffmpeg -c copy -movflags +faststart 处理！
  发布素材.md              ← 四平台文案源文件
  publish.json             ← 由 make-publish.mjs 自动生成
  封面\
    cover-3x4.png (或 .jpg)   ← 小红书、抖音竖封面、视频号主页卡使用
    cover-4x3.png (或 .jpg)   ← 抖音横封面、视频号分享卡、B站使用
    cover-9x16.jpg (或 .png)  ← 快手优先使用（无则自动回退 3x4）
```

### `发布素材.md` 模板（含快手）
```markdown
# 系列名 · 第 N 期｜本期标题

> 序号：1118
> 定时发布：2026-11-18 21:05
> 成品视频：成片.mp4

## 四、小红书
**标题：**
20字以内标题
**正文：**
正文内容（不放引流链接）
#账号标签 #话题2 #话题3 #话题4

## 五、抖音
**标题：**
30字以内标题
**正文：**
正文内容
#账号标签 #话题2 #话题3 #话题4

## 六、视频号
**短标题：**
6到16字无逗号短标题
**描述：**
描述内容
#账号标签 #话题2 #话题3 #话题4

## 快手
**正文：**
第一行放提问标题
正文描述内容
#账号标签 #话题2 #话题3 #话题4
```

### 生成与校验命令
```powershell
cd "$env:USERPROFILE\maitian\mdldm-maitian-publisher"
node tools/make-publish.mjs "<工程目录>\发布素材.md" "<工程目录>" --require <账号标签>
node tools/validate.mjs "<工程目录>"
```

---

## 四、两种运行分发的方式

### 方式 A：直接在 Chrome「麦田发布助手」侧边栏点（推荐日常手动）
1. 点开 Chrome 右侧「麦田发布助手」侧边栏；
2. 顶部「NAS 发布目录」点 **「选择」** 选中你的工程根目录（如 `麦田工程`），下方 **「本机路径」** 填入该目录的完整 Windows 路径（如 `Y:\AI励志\最终定稿\麦田工程`）；
3. 点选工程 → 确认显示 `✅ 校验通过` → 勾选要发的平台（小红书 / 抖音 / 视频号 / 快手）→ 点 **「一键填写所选平台」**；
4. 待状态变为绿色 **`待你发布`** 后，点「切到页面」人工核对 AI 声明与定时时间，手动点「定时发布」。

### 方式 B：通过麦田命令行 `hub.mjs` 调度
```powershell
cd "$env:USERPROFILE\maitian\mdldm-maitian"
node src/hub.mjs plan "<工程目录>"
node src/hub.mjs run "<工程目录>" --only douyin,xhs,channels,kuaishou
```
