# 数据管理可视化系统

一个支持动态建表、页面自动生成、数据可视化、AI对话的数据管理系统。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript | 响应式框架，组件化开发 |
| UI组件库 | TDesign | 腾讯企业级组件库 |
| 可视化图表 | SVG 自定义图表 | 柱状图、折线图、饼图等 |
| 后端框架 | NestJS (Node.js) | TypeScript全栈统一 |
| 数据库 | MySQL | 支持JSON字段，动态建表 |
| 缓存 | Redis | 数据缓存，提升性能 |
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
│   │   │   ├── dynamic-data/   # 动态数据模块
│   │   │   ├── table-meta/     # 表元数据模块
│   │   │   ├── ai-model/       # AI模型模块
│   │   │   ├── redis-cache/    # Redis缓存模块
│   │   │   └── user/           # 用户模块
│   │   ├── common/             # 公共模块
│   │   └── database/           # 数据库配置
│   └── package.json
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0
- Redis >= 6.0
- npm >= 9

### 后端启动

```bash
cd backend
npm install
cp .env.example .env
# 配置数据库连接信息、Redis连接信息、AI模型API Key
npm run start:dev
```

### 前端启动

```bash
cd frontend
npm install
npm run dev
```

## 功能模块

### 核心功能

- **数据表管理** - 可视化定义表结构，支持多种字段类型（文本、数字、日期、枚举、JSON等）
- **自动页面生成** - 建表后自动生成CRUD管理页面
- **数据可视化** - 支持多种展示方式
  - 表格视图：支持排序、筛选、分页
  - 卡片视图：卡片式数据展示
  - 图表视图：柱状图、折线图、饼图
  - 分组统计：按字段分组聚合查询
- **AI模型管理** - 配置多个AI模型，支持启用/禁用
- **AI对话辅助** - 自然语言查询、分析数据
- **Token消耗统计** - 消耗记录、统计分析、费用估算

### 技术特性

- **Redis缓存** - 热点数据缓存，提升查询性能
  - 表元数据缓存（自动失效机制）
  - 支持自定义缓存TTL
  - 数据变更自动清理缓存
- **动态查询** - 支持复杂条件筛选、关联查询
- **聚合分析** - 支持多字段分组、多种聚合函数（count、sum、avg、max、min）
- **时间粒度** - 支持按日、周、月、年分组统计

## 环境变量配置

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=data_management

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600

# AI模型配置
OPENAI_API_KEY=your_api_key
OPENAI_BASE_URL=https://api.openai.com/v1
```

## 作者

dzh

## 许可证

MIT
