const express = require('express');
const imageRoutes = require('./routes/image');

const app = express();
const port = process.env.PORT || 4000;

// 使用路由
app.use('/', imageRoutes);

app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 