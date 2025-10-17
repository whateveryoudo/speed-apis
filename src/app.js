const express = require('express');
const expressWs = require('express-ws');
const path = require('path');
const cors = require('cors');
const attachmentRoutes = require('./routes/attachment');
const onlyofficeRoutes = require('./routes/onlyoffice');
const userRoutes = require('./routes/user');
const aiDoubaoRoutes = require('./routes/ai/doubao');
const documentRoutes = require('./routes/document');
const hocuspocusServer = require('./routes/collaboration');
// 使用express-ws扩展Express应用
const { app } = expressWs(express());
const port = process.env.PORT || 3005;

// 配置 CORS 跨域
app.use(cors({
  origin: [
    'http://localhost:3003',  // 前端开发环境
    'http://localhost:3000',  // 备用端口
    'http://127.0.0.1:3003',
    'http://127.0.0.1:3000'
  ],
  credentials: true,  // 允许携带凭证
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 配置 EJS 模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 配置 body-parser 中间件
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码的请求体

// 使用路由
app.use('/attachment', attachmentRoutes);
app.use('/onlyoffice', onlyofficeRoutes);
app.use('/user', userRoutes);
app.use('/ai/doubao', aiDoubaoRoutes); // 提供豆包大模型
app.use('/documents', documentRoutes); // 文档管理接口
// 添加WebSocket路由用于Hocuspocus协同编辑
app.ws('/collaboration', (websocket, request) => {
  // 从查询参数中获取文档名和用户信息
  const urlParams = new URLSearchParams(request.url.split('?')[1] || '');
  const documentName = urlParams.get('documentName');
  
  // 构建上下文数据
  const context = {
    documentName,
    user: {
      id: urlParams.get('userId') || 'anonymous',
      name: urlParams.get('userName') || '匿名用户'
    },
    requestParameters: {
      documentName
    }
  };
  
  console.log(`WebSocket连接建立: ${context.user.name} - 文档: ${documentName}`);
  
  // 处理WebSocket连接
  hocuspocusServer.handleConnection(websocket, request, context);
});

// 添加服务状态检查接口
app.get('/collaboration/status', (req, res) => {
  res.json({
    status: 'running',
    url: `ws://localhost:${port}/collaboration`,
    message: '协同编辑服务已启动'
  });
});


// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

if (require.main === module) {

  app.listen(port, () => {
    console.log(`🎉 Server is running on http://localhost:${port}`);
    console.log(`📄 OnlyOffice预览服务: http://localhost:${port}/onlyoffice/preview`);
    console.log(`🎯 演示页面: http://localhost:${port}/onlyoffice/demo`);
    console.log(`🤖 AI接口: http://localhost:${port}/ai/doubao`);
    console.log(`📑 文档管理接口: http://localhost:${port}/documents`);
    console.log(`🔄 协同编辑服务状态: http://localhost:${port}/collaboration/status`);
    console.log(`🌐 协同编辑WebSocket: ws://localhost:${port}/collaboration`);
    console.log(`💡 WebSocket连接示例: ws://localhost:${port}/collaboration?documentName=example&userId=user123&userName=张三`);
    console.log(`✅ CORS 已启用，允许前端 http://localhost:3003 访问`);
  });
}

module.exports = app;