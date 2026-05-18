# 面试搭子 AI 核心模块

> 面试搭子（mianshidazi.com）- AI面试紧张终结者

## 📁 项目结构

```
mianshidazi/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── chat/
│   │       │   ├── interview/route.ts   # 面试官对话API
│   │       │   └── companion/route.ts    # 阿搭陪伴对话API
│   │       ├── diagnose/route.ts          # 紧张类型诊断API
│   │       ├── report/generate/route.ts  # 面试报告生成API
│   │       └── session/init/route.ts     # 会话初始化API
│   ├── components/
│   │   └── InterviewChat.tsx             # 前端对话组件示例
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── client.ts                 # 豆包API客户端
│   │   │   ├── tension-detector.ts       # 紧张检测工具
│   │   │   ├── report-generator.ts       # 报告生成工具
│   │   │   ├── knowledge-base.json       # 面试知识库
│   │   │   └── prompts/
│   │   │       ├── ada-prompt.ts         # 阿搭人格Prompt
│   │   │       ├── persona-prompts.ts     # 面试官人格Prompts
│   │   │       └── index.ts               # Prompt选择器
│   │   └── supabase.ts                   # Supabase配置
│   └── types/
│       └── index.ts                      # TypeScript类型定义
├── API-docs.md                            # API接口文档
├── supabase-schema.sql                    # 数据库表结构
└── package.json
```

## 🤖 AI 能力

### 5种面试官人格

| 人格 | 名称 | 特点 |
|------|------|------|
| A | 温柔鼓励型 | 适合初次练习、社恐用户 |
| B | 真实模拟型 | 模拟真实面试官，冷静专业 |
| C | 压力挑战型 | 故意施压，测试抗压能力 |
| D | 犀利毒舌型 | 直接指出问题（⚠️慎用）|
| E | HR老油条型 | 识别HR套路话术 |

### 阿搭人格

- **定位**: 懂行的过来人朋友（BAT 3年HR背景）
- **特点**: 温暖、直接、有力量、幽默、现实
- **风格**: 像微信聊天，不像AI客服
- **原则**: 情绪→知识→实践三拍子节奏

### 紧张检测

基于对话数据的多维度紧张检测：
- 停顿检测（>5秒 = 紧张信号）
- 语速检测（字数/秒 < 正常值）
- 填充词检测（"嗯""那个"频率）
- 回复长度检测（明显短于其他回答）

## 🔌 API 接口

### 1. POST /api/chat/interview
面试官对话（SSE流式）

### 2. POST /api/chat/companion
阿搭陪伴对话（SSE流式）

### 3. POST /api/diagnose
紧张类型诊断

### 4. POST /api/report/generate
面试报告生成

详见 [API-docs.md](./API-docs.md)

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local

# 启动开发服务器
npm run dev
```

## 📝 环境变量

```env
# 豆包 API
DASHSCOPE_API_KEY=your_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

## 🗄️ 数据库初始化

在 Supabase SQL Editor 中运行：

```bash
cat supabase-schema.sql | pbcopy
# 然后在Supabase中粘贴执行
```

## 📚 知识库

包含8大模块的面试知识：
1. 面试官视角
2. 面试类型识别
3. 面试潜台词解读
4. 常见面试陷阱
5. 不同岗位面试策略
6. 面试临场技巧
7. 薪资谈判
8. 面试复盘方法

每个知识点包含：标题、内容、来源标注、阿搭话术

## 📊 面试报告

报告包含：
- ✅ 一句话总结
- ✅ 表现分 vs 真实水平对比
- ✅ 亮点问题（3个）
- ✅ 紧张偷走的分数
- ✅ 紧张类型诊断
- ✅ 进步轨迹（历史数据）
- ✅ 下一步建议（3个）
- ✅ 阿搭写给特别的你

## 🎯 技术栈

- **Runtime**: Next.js 16 (App Router)
- **AI**: 豆包 Doubao-1.5-pro
- **Database**: Supabase
- **Language**: TypeScript

## 📄 许可证

Private - 面试搭子 © 2024
