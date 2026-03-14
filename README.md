# 数据管理可视化系统

一个支持动态建表、数据管理、可视化展示、AI智能对话的数据管理系统。

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite | 响应式框架，组件化开发 |
| UI组件库 | TDesign Vue Next | 腾讯企业级组件库 |
| 样式方案 | TailwindCSS + Less | 原子化CSS + 预处理器 |
| 图表可视化 | ECharts | 丰富的图表类型 |
| 图标库 | Lucide Vue Next | 现代化图标库 |
| 后端框架 | NestJS (Node.js) | TypeScript全栈统一 |
| 数据库 | MySQL + TypeORM | 支持JSON字段，动态建表 |
| 缓存 | Redis + ioredis | 数据缓存，验证码存储 |
| AI集成 | LangChain.js | 多模型统一适配（OpenAI、通义千问、智谱、豆包等） |
| 认证 | JWT + Passport | 用户认证与授权 |
| 邮件 | Nodemailer | 邮箱验证码登录 |

## 项目结构

```
data-management-system/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── api/                # API接口封装
│   │   │   ├── ai-model.ts     # AI模型管理接口
│   │   │   ├── auth.ts         # 认证相关接口
│   │   │   ├── dynamic-data.ts # 动态数据接口
│   │   │   ├── knowledge-base.ts # 知识库接口
│   │   │   ├── table-meta.ts   # 表元数据接口
│   │   │   ├── token-usage.ts  # Token消耗接口
│   │   │   ├── user.ts         # 用户管理接口
│   │   │   └── view-config.ts  # 视图配置接口
│   │   ├── components/         # 公共组件
│   │   ├── layouts/            # 布局组件
│   │   ├── views/              # 页面视图
│   │   │   ├── ai-chat/        # AI对话页面
│   │   │   ├── ai-model/       # AI模型管理页面
│   │   │   ├── dashboard/      # 仪表盘页面
│   │   │   ├── data-manage/    # 数据管理页面
│   │   │   ├── knowledge-base/ # 知识库管理页面
│   │   │   ├── login/          # 登录页面
│   │   │   ├── settings/       # 系统设置页面
│   │   │   ├── table-manage/   # 表管理页面
│   │   │   ├── token-stats/    # Token统计页面
│   │   │   ├── user-manage/    # 用户管理页面
│   │   │   └── visualization/  # 可视化页面
│   │   ├── stores/             # Pinia状态管理
│   │   ├── router/             # 路由配置
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   └── package.json
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── modules/            # 业务模块
│   │   │   ├── ai-model/       # AI模型管理（模型配置、对话、工具调用）
│   │   │   ├── auth/           # 认证模块（登录、验证码、密码修改）
│   │   │   ├── dynamic-data/   # 动态数据模块
│   │   │   ├── knowledge-base/ # 知识库模块
│   │   │   ├── mail/           # 邮件服务模块
│   │   │   ├── redis-cache/    # Redis缓存模块
│   │   │   ├── table-meta/     # 表元数据模块
│   │   │   ├── token-usage/    # Token消耗统计模块
│   │   │   ├── user/           # 用户管理模块
│   │   │   └── view-config/    # 视图配置模块
│   │   ├── common/             # 公共模块（过滤器、拦截器、装饰器）
│   │   ├── database/           # 数据库配置与实体
│   │   └── main.ts             # 入口文件
│   └── package.json
├── dump.rdb                     # Redis数据快照
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
cd data-management-system/backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库连接信息
npm run start:dev
```

### 前端启动

```bash
cd data-management-system/frontend
npm install
npm run dev
```

### 初始化管理员账号

```bash
cd data-management-system/backend
npm run db:init-admin
```

## 功能模块

### 用户认证
- 用户名+密码登录
- 邮箱+密码登录
- 邮箱+验证码登录
- JWT Token认证
- 密码修改

### 数据表管理
- 可视化定义表结构
- 支持多种字段类型（文本、数字、日期、枚举、JSON、富文本等）
- 建表后自动生成CRUD管理页面
- 支持表字段排序、必填、默认值设置

### 数据管理
- 表格视图：支持排序、筛选、分页
- 卡片视图：卡片式数据展示
- 图表视图：柱状图、折线图、饼图
- 分组统计：按字段分组聚合查询
- 数据导入导出

### AI模型管理
- 支持多种AI模型类型：
  - OpenAI (GPT-3.5/GPT-4)
  - 通义千问 (Qwen)
  - 智谱AI (GLM)
  - 豆包模型 (Doubao)
  - 自定义模型
- 模型启用/禁用切换
- 设置默认模型
- 模型连接测试
- 模型定价配置

### AI智能对话
- 自然语言查询数据
- 流式响应（SSE）
- 深度思考模式（Thinking）
- 工具调用能力：
  - 列出数据表
  - 查看表结构
  - 查询表数据
  - 统计数据
  - 聚合分析
  - 分组统计
  - 搜索知识库
  - 插入记录
  - 更新记录
- 知识库增强模式
- 多轮对话上下文

### 知识库管理
- 知识条目CRUD
- 支持分类管理
- AI对话智能检索

### Token消耗统计
- 消耗记录查询
- 按模型/日期统计
- 费用估算（基于模型定价）

### 用户管理
- 用户CRUD
- 用户状态切换（启用/禁用）
- 密码重置
- 最后登录时间记录

### 系统设置
- 个人信息修改
- 密码修改

## 环境变量配置

```env
# 数据库配置 (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=data_management

# 服务配置
PORT=3000
NODE_ENV=development

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600

# 邮件服务配置
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your_email@example.com
SMTP_PASS=your_password
EMAIL_FROM=your_email@example.com

# AI模型配置（可选，运行时通过界面配置）
# OPENAI_API_KEY=sk-xxx
# OPENAI_API_BASE=https://api.openai.com/v1
```

## API接口

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/auth/*` | 登录、验证码、密码修改 |
| 用户 | `/api/user/*` | 用户CRUD、状态切换 |
| 表管理 | `/api/table-meta/*` | 表结构定义、字段管理 |
| 数据管理 | `/api/dynamic-data/*` | 动态数据CRUD |
| AI模型 | `/api/ai/*` | 模型管理、对话、定价 |
| 知识库 | `/api/knowledge/*` | 知识条目管理 |
| Token统计 | `/api/token-usage/*` | 消耗统计 |
| 视图配置 | `/api/view-config/*` | 视图配置管理 |

## 数据库表

| 表名 | 说明 |
|------|------|
| sys_user | 用户表 |
| sys_table_meta | 表元数据 |
| sys_table_field | 表字段定义 |
| sys_ai_model | AI模型配置 |
| sys_ai_chat | AI对话记录 |
| sys_token_usage | Token消耗记录 |
| sys_model_pricing | 模型定价配置 |
| sys_knowledge | 知识库 |
| sys_view_config | 视图配置 |

## 作者

dzh

## 许可证

MIT
