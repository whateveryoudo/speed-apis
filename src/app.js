const express = require('express');
const attachmentRoutes = require('./routes/attachment');

const app = express();
const port = process.env.PORT || 4000;

// 配置 body-parser 中间件
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码的请求体

// 使用路由
app.use('/attachment', attachmentRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
  });
}

module.exports = app; 