# 数据管理系统

一套前端代码同时支持 Web 浏览器和 Electron 桌面客户端的数据管理系统。

## 功能特性

- 🌐 **Web 浏览器端**：基于 Vue 3 + Vite + TDesign 构建的现代化 Web 应用
- 🖥️ **Electron 桌面端**：作为 Web 端的"增强壳"，支持原生系统集成
- 📦 **代码复用**：一套前端代码，多端运行
- 🔌 **平台适配**：自动检测运行环境，适配不同平台的 API 调用

### 桌面端增强功能

- 原生系统文件对话框
- 系统通知支持
- 外部链接原生打开
- 应用菜单支持

## 技术栈

| 端 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + TypeScript + TDesign + Pinia |
| 后端 | NestJS + TypeORM + MySQL/Redis |
| 桌面 | Electron 28+ |

## 项目结构

```
data-management-system/
├── frontend/              # 前端项目（支持 Web 和 Electron）
│   ├── src/
│   │   ├── platforms/     # 平台适配层
│   │   │   ├── index.ts   # 平台适配器入口
│   │   │   ├── types.ts   # 类型定义
│   │   │   ├── web/       # Web 端适配器
│   │   │   └── electron/  # Electron 端适配器
│   │   ├── api/           # API 接口
│   │   ├── components/    # 组件
│   │   ├── views/         # 页面
│   │   ├── stores/        # 状态管理
│   │   └── utils/         # 工具函数
│   ├── .env               # 环境变量
│   └── package.json
│
├── desktop/               # Electron 桌面端
│   ├── main.js            # 主进程
│   ├── preload.js         # 预加载脚本
│   ├── assets/            # 应用图标
│   ├── electron-builder.yml # 打包配置
│   └── package.json
│
├── backend/               # 后端服务
│   └── ...
│
└── package.json           # 根目录脚本
```

## 快速开始

### 1. 安装依赖

```bash
# 安装所有依赖
npm run install:all

# 或者分别安装
cd frontend && npm install
cd ../desktop && npm install
cd ../backend && npm install
```

### 2. 启动开发服务器

```bash
# 启动后端服务
npm run start:backend

# Web 开发模式
npm run dev:web

# Electron 开发模式（同时启动前端和桌面端）
npm run dev:electron
```

### 3. 构建生产版本

```bash
# 构建 Web 版本
npm run build:web

# 构建 Electron 版本
npm run build:electron
```

## 平台适配器使用

在代码中通过平台适配器调用平台特定功能：

```typescript
import { usePlatform } from '@/platforms'

const platform = usePlatform()

// 显示系统通知
await platform.showNotification({
  title: '操作成功',
  body: '数据已保存',
})

// 选择文件
const result = await platform.selectFile({
  multiple: false,
  filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
})

// 打开外部链接
platform.openExternal('https://example.com')
```

## 环境配置

### Web 端

Web 端通过 Vite 代理连接后端，开发时配置 `frontend/vite.config.ts`：

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
}
```

### Electron 端

Electron 端直接连接远程服务器，配置 `frontend/.env`：

```env
VITE_API_BASE_URL=http://your-server:3000/api
```

## 打包说明

### Windows

```bash
npm run build:electron
# 生成文件：desktop/release/数据管理系统 Setup 1.0.0.exe
```

### macOS

```bash
npm run build:electron
# 生成文件：desktop/release/数据管理系统-1.0.0.dmg
```

### Linux

```bash
npm run build:electron
# 生成文件：desktop/release/数据管理系统-1.0.0.AppImage
```

## 作者

dzh

## 许可证

MIT
