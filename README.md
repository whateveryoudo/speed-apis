# 图片服务

一个简单的图片上传和预览服务，使用 Express.js 构建。

## 功能特性

- 图片上传接口
- 带认证的图片预览接口
- 本地文件存储

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
