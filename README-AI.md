# 火山引擎 AI 服务接入指南

## 📋 概述

本项目已集成火山引擎大模型服务，为富文本编辑器提供 AI 能力支持。

## 🚀 快速开始

### 1. 安装依赖

```bash
cd speed-apis
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3005

# 火山引擎配置
VOLC_API_KEY=your-api-key-here
VOLC_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3
VOLC_MODEL=ep-20241011xxxxx-xxxxx
```

### 3. 获取火山引擎配置

#### 3.1 创建 API Key

1. 访问 [火山引擎控制台](https://console.volcengine.com/ark)
2. 进入「API Key 管理」
3. 点击「创建新的 API Key」
4. 复制生成的 Key 到 `VOLC_API_KEY`

#### 3.2 创建推理接入点

1. 在控制台进入「推理接入点」
2. 点击「创建推理接入点」
3. 选择模型（推荐：`doubao-pro-32k`）
4. 创建后复制「接入点 ID」到 `VOLC_MODEL`

#### 3.3 选择接入地域

根据你的地域选择对应的 `VOLC_ENDPOINT`：

- **华北-北京**：`https://ark.cn-beijing.volces.com/api/v3`
- **华东-上海**：`https://ark.cn-shanghai.volces.com/api/v3`
- **华南-广州**：`https://ark.cn-guangzhou.volces.com/api/v3`

### 4. 启动服务

```bash
# 开发模式（支持热重载）
npm run dev

# 生产模式
npm start
```

服务将运行在 `http://localhost:3005`

## 📡 API 接口

### 1. 文本处理接口（非流式）

**接口：** `POST /ai/process`

**请求体：**

```json
{
  "action": "refactor",
  "content": "要处理的文本内容",
  "customPrompt": "自定义提示词（可选）"
}
```

**action 类型：**
- `refactor` - 改进写作
- `check` - 检查拼写和语法
- `simple` - 简化内容
- `rich` - 丰富内容
- `translate` - 翻译（中英互译）
- `summary` - 总结
- `custom` - 自定义（需要提供 customPrompt）

**响应：**

```json
{
  "success": true,
  "result": "处理后的文本",
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 150,
    "total_tokens": 250
  }
}
```

### 2. 流式处理接口（SSE）

**接口：** `POST /ai/stream`

**请求体：** 同上

**响应：** Server-Sent Events 流式数据

### 3. 健康检查

**接口：** `GET /ai/health`

**响应：**

```json
{
  "status": "ok",
  "service": "AI Service",
  "timestamp": "2024-10-11T12:00:00.000Z"
}
```

## 🎯 前端集成

前端已自动集成，使用示例：

```typescript
import { processTextWithAI } from '@/services/aiService'

// 调用 AI 处理
const response = await processTextWithAI({
  action: 'refactor',
  content: '需要改进的文本'
})

console.log(response.result) // 处理后的文本
```

## ⚙️ 配置说明

### 模型选择建议

| 模型 | 适用场景 | Token 上限 |
|------|---------|-----------|
| doubao-lite-4k | 简单任务，追求速度 | 4K |
| doubao-pro-4k | 通用场景 | 4K |
| doubao-pro-32k | 长文本处理 | 32K |
| doubao-pro-128k | 超长文档处理 | 128K |

### 参数调优

在 `src/routes/ai.js` 中可调整：

```javascript
{
  temperature: 0.7,  // 创造性：0-1，越高越随机
  max_tokens: 2000,  // 最大输出 token 数
  top_p: 0.9         // 采样范围：0-1
}
```

## 🔒 安全建议

1. **不要在前端暴露 API Key**，务必通过后端代理
2. 建议添加速率限制和用户认证
3. 生产环境使用 HTTPS
4. 定期轮换 API Key

## 💰 费用说明

火山引擎按 Token 计费，建议：

1. 在控制台设置费用告警
2. 监控 API 调用量
3. 合理设置 `max_tokens` 限制

## 🐛 故障排查

### 1. API Key 无效

```
错误：401 Unauthorized
解决：检查 VOLC_API_KEY 是否正确
```

### 2. 模型不存在

```
错误：404 Model not found
解决：检查 VOLC_MODEL 接入点 ID 是否正确
```

### 3. 请求超时

```
错误：Timeout
解决：
- 检查网络连接
- 增加 timeout 配置
- 减少输入文本长度
```

### 4. Token 超限

```
错误：Token limit exceeded
解决：
- 减少输入文本
- 使用更大 token 的模型
- 调整 max_tokens 参数
```

## 📚 参考文档

- [火山引擎官方文档](https://www.volcengine.com/docs/82379/1099455)
- [API 参考](https://www.volcengine.com/docs/82379/1263482)
- [模型列表](https://www.volcengine.com/docs/82379/1099320)

## 📞 技术支持

遇到问题？

1. 查看 [火山引擎文档中心](https://www.volcengine.com/docs/82379/1099455)
2. 联系火山引擎技术支持
3. 提交 Issue 到项目仓库

