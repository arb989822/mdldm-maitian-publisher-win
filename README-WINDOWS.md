# 麦田发布助手（Windows 适配版）

本仓库基于 [CzzzzzzJ/mdldm-maitian-publisher](https://github.com/CzzzzzzJ/mdldm-maitian-publisher) 适配 **Windows 10/11**，配套调度端为 `mdldm-maitian-win`。

## Windows 适配与新增功能
1. **Windows 路径兼容**：
   - `video.js`：支持 Windows 盘符路径校验（`C:\...`、`Y:\...`、`\\server\...`）；
   - `lib/publish.js`：`abs()` 按 `rootPath` 分隔符统一拼接 `\`，预检改为前台 `active: true` + `120s` 超时；
   - `tools/make-publish.mjs`、`tools/validate.mjs`：相对路径统一归一化为 `/`，支持 `pathToFileURL` 加载 `make-publish.local.mjs`。
2. **新增快手（`kuaishou`）适配器**：
   - `lib/platforms/kuaishou.js`、`lib/platforms/extra.js`、`lib/platforms/extra-specs.js`、`tools/make-publish.local.mjs`。
3. **平台稳定性优化**：
   - `lib/platforms/douyin.js`：先设定时，待视频就绪后打开「选择封面」弹窗并在必要时切前台重试；
   - `lib/platforms/channels.js`：3:4 封面不重复上传，找不到 4:3 编辑按钮时温和提示不阻断 `待你发布`。

详细 Agent 部署与使用说明请见主仓库 `AGENTS.md`。
