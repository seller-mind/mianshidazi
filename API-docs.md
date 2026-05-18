# 面试搭子 API 接口文档

## 基础信息

- **Base URL**: `/api`
- **Content-Type**: `application/json`
- **认证方式**: 暂无（后续添加）

---

## 1. 面试官对话 API

### POST /api/chat/interview

面试官对话接口，支持流式SSE响应。

**请求参数**

```json
{
  "message": "string",           // 用户输入（必填）
  "persona": "A|B|C|D|E",       // 面试官人格（必填）
  "sessionId": "string",        // 会话ID（必填）
  "interviewType": "string",    // 面试类型（可选）
  "resume": "string",           // 简历内容（可选）
  "timestamp": "number"         // 时间戳（可选）
}
```

**人格类型说明**

| 人格 | 名称 | 适用场景 |
|------|------|----------|
| A | 温柔鼓励型 | 初次练习、社恐用户 |
| B | 真实模拟型 | 适应真实面试节奏 |
| C | 压力挑战型 | 准备终面/高管面 |
| D | 犀利毒舌型 | 心理素质强、主动要求 |
| E | HR老油条型 | 识别KPI面/薪资谈判 |

**响应格式** (SSE流式)

```
Content-Type: text/event-stream

data: {"content": "你"}
data: {"content": "好，"}
data: {"content": "今天"}
...
data: [DONE]
```

**示例请求**

```javascript
const response = await fetch('/api/chat/interview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: '面试官你好，请介绍一下你自己',
    persona: 'B',
    sessionId: 'session_123456',
    interviewType: '产品经理一面'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  console.log('chunk:', chunk);
}
```

---

## 2. 阿搭陪伴对话 API

### POST /api/chat/companion

阿搭陪伴对话接口，支持流式SSE响应。

**请求参数**

```json
{
  "message": "string",           // 用户输入（必填）
  "context": "深夜|面试前|面试后|等通知|崩溃急救|日常",  // 场景上下文（必填）
  "sessionId": "string"          // 会话ID（必填）
}
```

**场景类型说明**

| 场景 | 说明 |
|------|------|
| 深夜 | 深夜失眠/焦虑 |
| 面试前 | 即将面试 |
| 面试后 | 刚面试完 |
| 等通知 | 等结果通知 |
| 崩溃急救 | 情绪崩溃需要安慰 |
| 日常 | 随便聊聊 |

**响应格式** (SSE流式)

同 `/api/chat/interview`

---

## 3. 紧张类型诊断 API

### POST /api/diagnose

诊断用户的紧张类型。

**请求参数**

```json
{
  "answers": [
    {
      "questionId": "string",
      "answer": "string"
    }
  ]
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "type": "C",
    "typeName": "中度紧张",
    "tensionIndex": 45,
    "description": "你有一定的紧张感，但还在可控范围内。",
    "suggestions": [
      "准备一些「过渡句」填充沉默",
      "面试前做几分钟冥想"
    ]
  },
  "signals": [
    {
      "type": "filler",
      "score": 60,
      "value": 5,
      "threshold": 3,
      "message": "填充词出现5次"
    }
  ]
}
```

---

## 4. 面试报告生成 API

### POST /api/report/generate

生成面试报告。

**请求参数**

```json
{
  "sessionId": "string",           // 会话ID（必填）
  "messages": [],                  // 消息历史（可选）
  "tensionData": [],               // 紧张信号数据（可选）
  "tensionDiagnosis": {}           // 紧张诊断结果（可选）
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "sessionId": "session_123456",
    "summary": "你本可以得85分。紧张偷走了你22分。",
    "scores": {
      "actualScore": 63,
      "realLevel": 85,
      "tensionLost": 22
    },
    "highlights": [
      {
        "question": "请介绍一下你的项目经验",
        "answer": "我负责了电商App的...",
        "score": 85
      }
    ],
    "tensionLosses": [
      {
        "question": "你的职业规划是什么",
        "reason": "回答内容过于简短",
        "lostPoints": 8
      }
    ],
    "tensionDiagnosis": {
      "type": "C",
      "typeName": "中度紧张",
      "tensionIndex": 45
    },
    "suggestions": [
      {
        "priority": 1,
        "title": "学习4-7-8呼吸法",
        "description": "面试前深呼吸..."
      }
    ],
    "adaMessage": "我懂，那种紧张到脑子一片空白的感觉...",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

---

## 5. 会话初始化 API

### POST /api/session/init

初始化面试或陪伴会话。

**请求参数**

```json
{
  "type": "interview|companion",  // 会话类型（必填）
  "persona": "A|B|C|D|E",          // 面试官人格（interview时必填）
  "context": "深夜|...",            // 场景上下文（companion时必填）
  "interviewType": "string"        // 面试类型（可选）
}
```

**响应示例**

```json
{
  "success": true,
  "data": {
    "sessionId": "session_1705312200_abc123",
    "createdAt": "1705312200000"
  }
}
```

---

## 错误响应格式

```json
{
  "error": "错误信息描述"
}
```

HTTP状态码:
- `200` - 成功
- `400` - 请求参数错误
- `500` - 服务器内部错误

---

## 前端调用示例

```tsx
// 面试对话
import InterviewChat from '@/components/InterviewChat';

export default function InterviewPage() {
  return (
    <InterviewChat
      sessionId="session_123"
      persona="B"
      interviewType="产品经理一面"
    />
  );
}
```
