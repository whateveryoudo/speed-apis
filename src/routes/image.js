const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * 文件信息存储类
 */
class FileStorage {
  constructor() {
    // 使用项目根目录下的 uploads 文件夹
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 生成文件信息
   * @param {Object} file - 上传的文件对象
   * @returns {Object} 文件信息对象
   */
  generateFileInfo(file) {
    const fieldId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    return {
      id: fieldId,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      extension: path.extname(file.originalname)
    };
  }

  /**
   * 保存文件信息
   * @param {Object} fileInfo - 文件信息对象
   */
  saveFileInfo(fileInfo) {
    const infoPath = path.join(this.uploadDir, `${fileInfo.id}.json`);
    fs.writeFileSync(infoPath, JSON.stringify(fileInfo, null, 2));
  }

  /**
   * 获取文件信息
   * @param {string} fieldId - 文件ID
   * @returns {Object|null} 文件信息对象
   */
  getFileInfo(fieldId) {
    const infoPath = path.join(this.uploadDir, `${fieldId}.json`);
    if (!fs.existsSync(infoPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(infoPath, 'utf8'));
  }

  /**
   * 获取文件路径
   * @param {Object} fileInfo - 文件信息对象
   * @returns {string} 文件完整路径
   */
  getFilePath(fileInfo) {
    return path.join(this.uploadDir, `${fileInfo.id}${fileInfo.extension}`);
  }

  /**
   * 保存文件
   * @param {Object} file - 上传的文件对象
   * @returns {Promise<Object>} 文件信息对象
   */
  async saveFile(file) {
    return new Promise((resolve, reject) => {
      try {
        const fileInfo = this.generateFileInfo(file);
        const filePath = this.getFilePath(fileInfo);
        
        // 保存文件
        fs.copyFileSync(file.path, filePath);
        // 删除临时文件
        fs.unlinkSync(file.path);
        // 保存文件信息
        this.saveFileInfo(fileInfo);
        
        resolve(fileInfo);
      } catch (error) {
        reject(error);
      }
    });
  }
}

const fileStorage = new FileStorage();

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, fileStorage.uploadDir);
  },
  filename: function (req, file, cb) {
    const fieldId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    cb(null, `${fieldId}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage: storage });

// 认证中间件
const authMiddleware = (req, res, next) => {
  // 支持两种认证方式
  const headerToken = req.headers.authorization?.replace('Bearer ', '');
  const queryToken = req.query.token;
  const token = headerToken || queryToken;
  console.log('token', token);
  if (!token || token !== 'speed-test-token') {
    return res.status(401).json({ error: '无权限访问' });
  }
  next();
};

// 上传接口
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的图片' });
    }

    // 保存文件并获取文件信息
    const fileInfo = await fileStorage.saveFile(req.file);
    
    res.json({
      message: '上传成功',
      data: {
        id: fileInfo.id,
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        fileSize: fileInfo.fileSize,
        previewUrl: `/preview/${fileInfo.id}`
      }
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ error: '文件上传失败' });
  }
});

// 预览接口
router.get('/preview/:fieldId', authMiddleware, (req, res) => {
  const fieldId = req.params.fieldId;
  const fileInfo = fileStorage.getFileInfo(fieldId);
  console.log('fileInfo', fileInfo);
  if (!fileInfo) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  const filePath = fileStorage.getFilePath(fileInfo);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  // 设置响应头
  res.setHeader('Content-Type', fileInfo.fileType);
  res.setHeader('Content-Disposition', `inline; filename="${fileInfo.fileName}"`);
  res.sendFile(filePath);
});

module.exports = router; 