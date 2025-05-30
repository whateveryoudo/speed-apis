const express = require('express');
const attachmentRoutes = require('./routes/attachment');

const app = express();
const port = process.env.PORT || 4000;

// 使用路由
app.use('/attachment', attachmentRoutes);

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 