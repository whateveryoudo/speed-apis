const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ResponseUtil = require('../utils/response');
const { authMiddleware, onlyofficeAuthMiddleware } = require('../config/auth');

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
    const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    // 确保文件名已经被正确解码
    console.log(file);
    const fileName = file.originalname;
    return {
      id: fileId,
      fileName: fileName,
      fileType: file.mimetype,
      fileSize: file.size,
      extension: path.extname(fileName)
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
   * @param {string} fileId - 文件ID
   * @returns {Object|null} 文件信息对象
   */
  getFileInfo(fileId) {
    const infoPath = path.join(this.uploadDir, `${fileId}.json`);
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

  /**
   * 删除文件
   * @param {string} fileId - 文件ID
   * @returns {Promise<boolean>} 删除是否成功
   */
  async deleteFile(fileId) {
    return new Promise((resolve, reject) => {
      try {
        const fileInfo = this.getFileInfo(fileId);
        if (!fileInfo) {
          resolve(false);
          return;
        }

        const filePath = this.getFilePath(fileInfo);
        const infoPath = path.join(this.uploadDir, `${fileId}.json`);

        // 删除文件
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // 删除文件信息
        if (fs.existsSync(infoPath)) {
          fs.unlinkSync(infoPath);
        }

        resolve(true);
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
    const fileId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    // 解决中文文件名问题
    const originalname = decodeURIComponent(file.originalname);
    console.log('originalname',originalname);
    file.originalname = originalname;
    cb(null, `${fileId}${path.extname(originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    files: 50,               // 最多50个文件
    fileSize: 10 * 1024 * 1024  // 每个文件最大 10MB
  },
  fileFilter: function (req, file, cb) {
    console.log('start',file);
    // 解决中文文件名问题
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    // 允许所有文件类型
    cb(null, true);
  }
});

// 使用共享的认证中间件

// 单文件上传接口
router.post('/upload/single', authMiddleware, upload.single('file'), async (req, res) => {
  console.log('进入了 ')
  try {
    if (!req.file) {
      return res.status(400).json(ResponseUtil.error('请选择要上传的文件', 400));
    }
    
    const fileInfo = await fileStorage.saveFile(req.file);
    
    res.json(ResponseUtil.success({
      id: fileInfo.id,
      fileName: fileInfo.fileName,
      fileType: fileInfo.fileType,
      fileSize: fileInfo.fileSize
    }, '上传成功'));
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json(ResponseUtil.error('文件大小超出限制（最大10MB）', 400));
    }
    console.error('文件上传失败:', error);
    res.status(500).json(ResponseUtil.error('文件上传失败'));
  }
});

// 批量文件上传接口
router.post('/upload/multi', authMiddleware, upload.array('files[]', 50), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json(ResponseUtil.error('请选择要上传的文件', 400));
    }
    
    // 批量保存文件
    const fileInfos = await Promise.all(
      req.files.map(file => fileStorage.saveFile(file))
    );
    
    res.json(ResponseUtil.success(
      fileInfos.map(fileInfo => ({
        id: fileInfo.id,
        fileName: fileInfo.fileName,
        fileType: fileInfo.fileType,
        fileSize: fileInfo.fileSize
      })),
      '上传成功'
    ));
  } catch (error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json(ResponseUtil.error('文件大小超出限制（最大10MB）', 400));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json(ResponseUtil.error('文件数量超出限制（最多50个）', 400));
    }
    console.error('文件上传失败:', error);
    res.status(500).json(ResponseUtil.error('文件上传失败'));
  }
});

/**
 * 处理文件访问的通用函数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {boolean} isDownload - 是否为下载模式
 */
const handleFileAccess = (req, res, isDownload = false) => {
  const fileId = req.params.fileId;
  const fileInfo = fileStorage.getFileInfo(fileId);
  
  if (!fileInfo) {
    return res.status(404).json(ResponseUtil.notFound('文件不存在'));
  }
  
  const filePath = fileStorage.getFilePath(fileInfo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json(ResponseUtil.notFound('文件不存在'));
  }
  
  // 设置响应头
  if (isDownload) {
    console.log('开始下载文件:', {
      fileId,
      fileName: fileInfo.fileName,
      fileSize: fileInfo.fileSize,
      filePath
    });

    res.setHeader('Content-Type', 'application/octet-stream');
    // 对文件名进行 URI 编码，并添加 UTF-8 编码声明
    const encodedFilename = encodeURIComponent(fileInfo.fileName);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}`);
    res.setHeader('Content-Length', fileInfo.fileSize);
    
    // 使用直接读取方式
    try {
      const fileContent = fs.readFileSync(filePath);
      console.log('文件读取完成，大小:', fileContent.length);
      res.send(fileContent);
      console.log('文件发送完成');
    } catch (error) {
      console.error('文件读取失败:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: '文件读取失败' });
      }
    }
  } else {
    res.setHeader('Content-Type', fileInfo.fileType);
    console.log(fileInfo.fileName)
    // 对文件名进行 URI 编码，并添加 UTF-8 编码声明
    const encodedFilename = encodeURIComponent(fileInfo.fileName);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodedFilename}`);
    res.sendFile(filePath);
  }
};

// 预览接口(用于web端访问，建议仅图片使用)
router.get('/preview/:fileId', onlyofficeAuthMiddleware, (req, res) => {
  console.log('进入了')
  handleFileAccess(req, res, false);
});
// 这里另起一个接口（用于onlyoffice访问）
router.get('/onlyoffice/preview/:fileId', onlyofficeAuthMiddleware, (req, res) => {
  console.log('进入了')
  handleFileAccess(req, res, false);
});
// 下载接口
router.get('/download/:fileId', authMiddleware, (req, res) => {
  handleFileAccess(req, res, true);
});

/**
 * 删除文件接口
 * @route DELETE /attachment/delete/:fileId
 * @param {string} fileId - 文件ID
 * @returns {Object} 删除结果
 */
router.delete('/delete/:fileId', authMiddleware, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const success = await fileStorage.deleteFile(fileId);

    if (!success) {
      return res.status(404).json(ResponseUtil.notFound('文件不存在'));
    }

    res.json(ResponseUtil.success(null, '文件删除成功'));
  } catch (error) {
    console.error('文件删除失败:', error);
    res.status(500).json(ResponseUtil.error('文件删除失败'));
  }
});

module.exports = router; 