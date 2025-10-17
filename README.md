# 图片服务

一个简单的图片上传和预览服务，使用 Express.js 构建。

## 功能特性

- 图片上传接口
- 带认证的图片预览接口
- 本地文件存储
- documents.sql为协同的文档表结构，目前字段很简单，仅做演示使用

## 安装

```bash
npm install
```

## 运行

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API 接口

### 上传图片

- 方法：POST
- 路径：/upload
- 参数：form-data 中的 image 字段
- 返回：
  ```json
  {
    "message": "上传成功",
    "filename": "文件名",
    "path": "/preview/文件名"
  }
  ```

### 预览图片

- 方法：GET
- 路径：/preview/:filename
- 请求头：Authorization: Bearer your-secret-token
- 返回：图片文件

## 注意事项

1. 请确保在请求预览接口时携带正确的认证信息
2. 上传的图片将保存在 uploads 目录中
3. 默认端口为 3000，可通过环境变量 PORT 修改

# Speed APIs

一个基于 Node.js + Express 的 API 服务项目。

## 功能特性

- 文件上传和管理
- OnlyOffice 文档预览和编辑
- JWT 身份认证
- 文件附件处理

## 安装和运行

```bash
npm install
npm start
```

服务器将在 http://localhost:3005 启动。

## API 接口

### 文件上传

- `POST /attachment/upload` - 上传文件
- `GET /attachment/download/:fileId` - 下载文件
- `GET /attachment/onlyoffice/preview/:fileId` - OnlyOffice 预览文件

### OnlyOffice 集成

#### 方案一：API 接口方式

- `POST /onlyoffice/login` - 用户登录获取 JWT token
- `POST /onlyoffice/verify` - 验证 JWT token
- `POST /onlyoffice/refresh` - 刷新 JWT token
- `POST /onlyoffice/config` - 获取 OnlyOffice 配置（需要认证）

**使用流程：**
1. 调用登录接口获取 token
2. 使用 token 调用 `/onlyoffice/config` 接口获取配置
3. 前端使用返回的配置初始化 `DocsAPI.DocEditor`

#### 方案二：静态预览页面方式（推荐）

- `GET /onlyoffice/preview` - 预览入口页面
- `GET /onlyoffice/preview/:fileId` - 直接预览指定文件

**使用方式：**
1. 直接访问 `http://localhost:3005/onlyoffice/preview` 进入预览入口页面
2. 输入文件ID和选择预览模式
3. 或者直接访问 `http://localhost:3005/onlyoffice/preview/{fileId}?mode=view` 进行预览

**优势：**
- 前端无需发送 API 请求
- 直接通过 URL 访问，支持书签和分享
- 内置模式切换（预览/编辑）
- 响应式设计，支持移动端

## 配置说明

### 环境变量

- `PORT` - 服务器端口（默认 3005）
- `AUTH_JWT_SECRET` - JWT 认证密钥
- `ONLYOFFICE_JWT_SECRET` - OnlyOffice 签名密钥

### OnlyOffice 服务器

需要配置 OnlyOffice 文档服务器地址，在预览页面的 HTML 中修改：

```html
<script src="https://your-onlyoffice-server/web-apps/apps/api/documents/api.js"></script>
```

## 使用示例

### 方案一：API 方式

```javascript
// 1. 登录获取 token
const loginResponse = await fetch('/onlyoffice/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'ykx', password: '123456' })
});
const { token } = await loginResponse.json();

// 2. 获取 OnlyOffice 配置
const configResponse = await fetch('/onlyoffice/config', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ fileId: 'your-file-id', mode: 'view' })
});
const { config } = await configResponse.json();

// 3. 初始化编辑器
const docEditor = new DocsAPI.DocEditor('placeholder', config);
```

### 方案二：静态页面方式

```javascript
// 直接跳转到预览页面
window.location.href = '/onlyoffice/preview/your-file-id?mode=view';

// 或者在新窗口打开
window.open('/onlyoffice/preview/your-file-id?mode=edit', '_blank');
```

## 注意事项

1. 确保 OnlyOffice 文档服务器可访问
2. 文件上传后会在 `uploads/` 目录生成对应的 JSON 信息文件
3. 预览页面支持的文件类型：Word、Excel、PowerPoint 等
4. 编辑模式需要 OnlyOffice 服务器支持相应权限

## 开发说明

项目结构：
```
src/
├── app.js              # 主应用文件
├── config/             # 配置文件
├── routes/             # 路由文件
├── utils/              # 工具函数
└── uploads/            # 上传文件存储目录
```
