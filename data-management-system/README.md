# 数据管理可视化系统

一个支持动态建表、页面自动生成、数据可视化、AI对话的数据管理系统。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | 响应式框架，组件化开发 |
| UI组件库 | TDesign | 腾讯企业级组件库 |
| 可视化图表 | ECharts | 百度开源图表库 |
| 后端框架 | NestJS (Node.js) | TypeScript全栈统一 |
| 数据库 | PostgreSQL | 支持JSON字段，动态建表 |
| AI集成 | LangChain.js | 多模型统一适配 |

## 项目结构

```
data-management-system/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                # API接口封装
│   │   ├── components/         # 公共组件
│   │   ├── layouts/            # 布局组件
│   │   ├── views/              # 页面视图
│   │   ├── stores/             # Pinia状态管理
│   │   ├── router/             # 路由配置
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   └── package.json
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── modules/            # 业务模块
│   │   ├── common/             # 公共模块
│   │   └── database/           # 数据库配置
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### 后端启动

```bash
cd backend
npm install
cp .env.example .env
# 配置数据库连接信息
npm run start:dev
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

## 功能模块

- **数据表管理** - 可视化定义表结构，支持多种字段类型
- **自动页面生成** - 建表后自动生成CRUD管理页面
- **数据可视化** - 表格、卡片、图表等多种展示方式
- **AI模型管理** - 配置多个AI模型，支持启用/禁用
- **AI对话辅助** - 自然语言查询、分析数据
- **Token消耗统计** - 消耗记录、统计分析、费用估算

## 作者

dzh

## 许可证

MIT
