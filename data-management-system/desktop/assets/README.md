# Electron 桌面端资源目录

## 图标文件说明

请将以下图标文件放置在此目录：

- `icon.png` - 应用图标（PNG 格式，推荐 512x512 或 1024x1024）
- `icon.ico` - Windows 应用图标（ICO 格式，推荐 256x256）
- `icon.icns` - macOS 应用图标（ICNS 格式）
- `icons/` - Linux 图标目录（包含不同尺寸的 PNG 图标）

## 图标生成工具推荐

- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) - 从单个 PNG 生成所有平台图标
- [icon-gen](https://www.npmjs.com/package/icon-gen) - 图标生成工具

## 快速生成图标

1. 准备一个 1024x1024 的 PNG 图标
2. 运行以下命令：
   ```bash
   npx electron-icon-builder --input=./assets/icon.png --output=./assets
   ```
