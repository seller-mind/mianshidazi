# 面试搭子 (mianshidazi.com)

AI面试紧张终结者，帮助面试紧张的用户缓解焦虑、提升面试表现。

## 产品特点

- **紧张类型诊断**：通过8道对话式问题，精准识别你的紧张类型（脑暴型/身体型/社交恐惧型/完美主义型/PTSD型）
- **AI面试练习**：模拟真实面试场景，追问式练习，提前适应面试节奏
- **个性化建议**：基于诊断结果，提供针对性的改善建议

## 技术栈

- **前端框架**：Next.js 14 (App Router) + TypeScript
- **样式方案**：Tailwind CSS
- **数据库**：Supabase (PostgreSQL + Auth)
- **AI模型**：豆包 Doubao-1.5-pro
- **支付系统**：虎皮椒 XunhuPay

## 项目结构

```
mianshidazi/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 落地页
│   │   ├── globals.css         # 全局样式
│   │   ├── diagnose/           # 紧张类型诊断页
│   │   ├── practice/          # AI面试练习页
│   │   ├── report/             # 面试报告页
│   │   ├── dashboard/          # 用户仪表盘
│   │   ├── auth/               # 认证相关
│   │   └── api/                # API路由
│   ├── components/
│   │   ├── ui/                 # 基础UI组件
│   │   ├── landing/            # 落地页组件
│   │   ├── diagnose/           # 诊断组件
│   │   └── chat/               # 对话组件
│   ├── lib/
│   │   ├── supabase/           # Supabase客户端
│   │   ├── ai/                 # AI相关配置
│   │   └── utils.ts            # 工具函数
│   └── types/                  # TypeScript类型
├── .env.local                  # 环境变量
└── package.json
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Doubao API
DASHSCOPE_API_KEY=your_dashscope_api_key

# XunhuPay
XUNHU_APP_ID=your_app_id
XUNHU_APP_SECRET=your_app_secret
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 核心功能

### 落地页 (/)

五屏设计：
1. Hero区 - 主Slogan + CTA
2. 痛点共鸣 - 4个面试紧张场景
3. 反直觉洞察 - 3个面试真相
4. 产品展示 - 诊断/练习功能预览
5. 定价方案 - 月卡/次卡

### 紧张类型诊断 (/diagnose)

- 对话式问卷，像朋友聊天不像填表
- 8道问题，覆盖5种紧张类型
- 实时显示进度
- 诊断结果包含：类型名称、紧张指数、分数对比、个性化建议

### AI面试练习 (/practice)

- 模拟真实面试官对话
- 追问式练习
- 支持紧张类型上下文
- 可导出面试报告

## 部署

### Vercel

1. Fork 本仓库
2. 在 Vercel 中导入项目
3. 配置环境变量
4. Deploy

## 环境变量说明

| 变量名 | 说明 | 必需 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL | 是 |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名密钥 | 是 |
| DASHSCOPE_API_KEY | 豆包 API 密钥 | 是 |
| XUNHU_APP_ID | 虎皮椒 App ID | 是 |
| XUNHU_APP_SECRET | 虎皮椒 App Secret | 是 |

## License

MIT

## Git 部署指南

### 推送到 GitHub

```bash
# 1. 在 GitHub 创建仓库后，添加 remote
git remote add origin git@github.com:your-username/mianshidazi.git

# 2. 推送代码
git branch -M main
git push -u origin main
```

### Vercel 部署

1. 在 Vercel 中导入 GitHub 仓库
2. 添加环境变量（在 Vercel Dashboard → Settings → Environment Variables）
3. Deploy

### 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 环境变量清单

| 变量名 | 说明 | 示例 |
|--------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase 项目 URL | https://xxx.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase 匿名密钥 | eyJhbG... |
| DASHSCOPE_API_KEY | 豆包 API 密钥 | sk-dc2a94... |
| XUNHU_APP_ID | 虎皮椒 App ID | 201906180430 |
| XUNHU_APP_SECRET | 虎皮椒 App Secret | 7fee1226... |

## 开发说明

- 页面路由：`/` 落地页, `/diagnose` 诊断, `/practice` 练习, `/report` 报告, `/dashboard` 仪表盘
- 组件目录：`src/components/` 下按功能分组
- 工具函数：`src/lib/utils.ts`
- 类型定义：`src/types/index.ts`
