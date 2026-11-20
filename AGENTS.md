# 麦田发布助手（Windows 专用版）· AI Agent 执行规范

请完整阅读同目录下的 [README.md](./README.md) 以及配套中控仓库 `https://github.com/arb989822/mdldm-maitian-win` 的 `AGENTS.md`。

## Agent 铁律（禁止回退到旧版配置！）
1. **克隆源铁律**：必须从 `https://github.com/arb989822/mdldm-maitian-win.git` 和 `https://github.com/arb989822/mdldm-maitian-publisher-win.git` 克隆，**严禁执行原版 `CzzzzzzJ` 的 `install.sh` 或克隆 `CzzzzzzJ` 原仓库**。
2. **驱动模式铁律**：`config.json` 中必须设置 `"driver": "plugin"` 并填写 Chrome 扩展的 32 位 `"extensionId"`，配合 `batches` 与 `manual` 中的 `"kuaishou"`。
3. **视频封装铁律**：所有 `成片.mp4` 必须执行 `ffmpeg -v error -y -i input.mp4 -c copy -movflags +faststart out.mp4`，否则小红书网页端会报「无视频流信息」。
4. **最优封面铁律**：工程目录 `封面\` 下放置 `cover-3x4.png`（或 `.jpg`）、`cover-4x3.png`（或 `.jpg`）、`cover-9x16.jpg`（或 `.png`），由 `make-publish.mjs` 自动为小红书配 `3x4`、抖音配 `4x3+3x4`、视频号配 `4x3+3x4`、快手配 `9x16`。
5. **插件热重载铁律**：每次修改插件 `.js` 文件后，必须在 `chrome://extensions` 点击刷新（或通过 CDP 调用 `chrome.runtime.reload()`），仅重开侧边栏不会刷新后台 Service Worker。
