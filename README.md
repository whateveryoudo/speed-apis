# Speed APIs

一个基于 Node.js + Express 的 API 服务项目，提供文件管理、OnlyOffice 文档预览编辑、AI 文本处理和实时协同编辑功能。

> **⚠️ 警告**  
> 此项目仅为编辑器和组件提供示例响应，请勿直接用在实际项目中！

## 功能特性

- 📁 **文件上传和管理** - 支持单文件/多文件上传、预览、下载、删除 (目前文件存放在本地目录，未存放数据库，请自行手动清除)
- 📄 **OnlyOffice 文档预览编辑** - 支持 Word、Excel、PowerPoint 等格式在线预览和编辑
- 🤖 **AI 文本处理** - 基于火山引擎大模型，支持文本改进、翻译、总结等功能
- 🔄 **实时协同编辑** - 基于 Hocuspocus + Yjs 的实时协同文档编辑
- 🔐 **JWT 身份认证** - 统一的认证体系

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
# 服务器配置
PORT=3005

# JWT 认证
AUTH_JWT_SECRET=your-jwt-secret-key

# OnlyOffice 配置
ONLYOFFICE_JWT_SECRET=your-onlyoffice-secret
ONLYOFFICE_SERVER_URL=https://your-onlyoffice-server

# 火山引擎 AI 配置（可选）
VOLC_API_KEY=your-api-key-here
VOLC_ENDPOINT=https://ark.cn-beijing.volces.com/api/v3
VOLC_MODEL=ep-xxxxxxxx-xxxxx

# 数据库配置（用于协同编辑）
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=your-database
```

### 3. 初始化数据库

执行 `documents.sql` 创建协同编辑所需的文档表。

### 4. 启动服务

```bash
# 开发模式（支持热重载）
npm run dev

# 生产模式
npm start
```

服务启动后访问：`http://localhost:3005`

## API 接口

### 用户认证

```bash
POST /user/login
# 请求体: { "username": "ykx", "password": "123456" }
# 返回: { "token": "xxx", ... }
```

### 文件管理

```bash
# 上传文件（需要认证）
POST /attachment/upload/single
POST /attachment/upload/multi

# 预览文件
GET /attachment/preview/:fileId

# 下载文件
GET /attachment/download/:fileId

# 删除文件
DELETE /attachment/delete/:fileId
```

### OnlyOffice 文档预览

```bash
# 方式一：直接访问预览页面（推荐）
GET /onlyoffice/filePreview/:fileId?mode=view
# mode 可选: view（预览）| edit（编辑）

# 方式二：获取配置后前端集成
POST /onlyoffice/config
# 请求头: Authorization: Bearer {token}
# 请求体: { "fileId": "xxx", "mode": "view" }
```

### AI 文本处理

```bash
# 非流式处理
POST /ai/doubao/process
# 请求头: Authorization: Bearer {token}
# 请求体: {
#   "action": "refactor",  # refactor|check|simple|rich|translate|summary|custom
#   "content": "要处理的文本",
#   "customPrompt": "自定义提示词（可选）"
# }

# 流式处理（SSE）
POST /ai/doubao/stream
# 同上，返回 Server-Sent Events 流式数据

# 健康检查
GET /ai/doubao/health
```

**action 说明：**
- `refactor` - 改进写作
- `check` - 检查拼写和语法
- `simple` - 简化内容
- `rich` - 丰富内容
- `translate` - 中英互译
- `summary` - 总结
- `custom` - 自定义（需提供 customPrompt）

### 协同编辑

```bash
# WebSocket 连接
ws://localhost:3005/collaboration?documentName=example&userId=user123&userName=张三

# 服务状态检查
GET /collaboration/status
```

### 文档管理

```bash
# 获取文档列表
GET /documents

# 删除文档
DELETE /documents/:name
```

## 使用示例

### OnlyOffice 预览

```javascript
// 直接访问预览页面
window.location.href = '/onlyoffice/filePreview/your-file-id?mode=view';
```

### AI 文本处理

```javascript
// 调用 AI 处理接口
const response = await fetch('/ai/doubao/process', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    action: 'refactor',
    content: '需要改进的文本'
  })
});
const { result } = await response.json();
```

### 协同编辑（前端）

```javascript
import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

const ydoc = new Y.Doc()
const provider = new HocuspocusProvider({
  url: 'ws://localhost:3005',
  name: 'document-name',
  document: ydoc,
  // 可选参数
  parameters: {
    documentName: 'document-name',
    userId: 'user123',
    userName: '张三'
  }
})

// 使用 Yjs 的协同数据结构（如 Y.Text）
const ytext = ydoc.getText('content')
```

## 配置说明

### 火山引擎 AI 配置

1. **创建 API Key**：访问 [火山引擎控制台](https://console.volcengine.com/ark) → API Key 管理
2. **创建推理接入点**：选择模型（推荐 `doubao-pro-32k`），获取接入点 ID
3. **选择地域**：
   - 华北-北京：`https://ark.cn-beijing.volces.com/api/v3`
   - 华东-上海：`https://ark.cn-shanghai.volces.com/api/v3`
   - 华南-广州：`https://ark.cn-guangzhou.volces.com/api/v3`

### OnlyOffice 服务器

需要在 `.env` 中配置 `ONLYOFFICE_SERVER_URL`，或在预览页面的 HTML 中修改 OnlyOffice API 脚本地址。

## 项目结构

```
src/
├── app.js              # 主应用文件
├── config/             # 配置文件（auth、onlyoffice、upload）
├── routes/             # 路由文件
│   ├── ai/             # AI 相关路由
│   ├── attachment.js   # 文件上传管理
│   ├── onlyoffice.js   # OnlyOffice 预览编辑
│   ├── collaboration.js # 协同编辑服务
│   ├── document.js     # 文档管理
│   └── user.js         # 用户认证
├── utils/              # 工具函数
└── views/              # 视图模板
```

## 注意事项

1. 所有需要认证的接口都需要在请求头中携带 `Authorization: Bearer {token}`
2. 文件上传后会在 `uploads/` 目录生成对应的 JSON 信息文件
3. 协同编辑需要先执行 `documents.sql` 创建数据库表
4. AI 功能需要配置火山引擎 API Key 才能使用
5. 确保 OnlyOffice 文档服务器可访问
