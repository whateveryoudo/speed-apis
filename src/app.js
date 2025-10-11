const express = require('express');
const path = require('path');
const cors = require('cors');
const attachmentRoutes = require('./routes/attachment');
const onlyofficeRoutes = require('./routes/onlyoffice');
const userRoutes = require('./routes/user');
const aiRoutes = require('./routes/ai');

const app = express();
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
app.use('/ai', aiRoutes);
// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`\n🚀 服务器运行在 http://localhost:${port}`);
    console.log(`📝 OnlyOffice 预览: http://localhost:${port}/onlyoffice/preview`);
    console.log(`🎯 演示页面: http://localhost:${port}/onlyoffice/demo`);
    console.log(`🤖 AI 接口: http://localhost:${port}/ai/health`);
    console.log(`✅ CORS 已启用，允许前端 http://localhost:3003 访问\n`);
  });
}

module.exports = app; 