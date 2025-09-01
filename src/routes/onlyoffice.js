const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const ResponseUtil = require('../utils/response');
const fs = require('fs');
const path = require('path');
const { AUTH_JWT_SECRET, authMiddleware } = require('../config/auth');
const { ONLYOFFICE_JWT_SECRET } = require('../config/onlyoffice');

// 登录 JWT 密钥
const JWT_SECRET = AUTH_JWT_SECRET;
// OnlyOffice 文档服务器签名密钥
const ONLYOFFICE_SECRET = ONLYOFFICE_JWT_SECRET;

// 使用共享的认证中间件

// 用户信息（实际项目中应该从数据库获取）
const VALID_USER = {
  username: 'ykx',
  password: '123456'
};

/**
 * 生成 JWT Token 接口
 * @route POST /onlyoffice/login
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Object} 包含 token 的响应
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证用户名和密码
    if (!username || !password) {
      return res.status(400).json(ResponseUtil.error('用户名和密码不能为空', 400));
    }

    if (username !== VALID_USER.username || password !== VALID_USER.password) {
      return res.status(401).json(ResponseUtil.error('用户名或密码错误', 401));
    }

    // 生成 JWT token，有效期 24 小时
    const token = jwt.sign(
      { 
        username: username,
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json(ResponseUtil.success({
      token: token,
      expiresIn: '24h',
      username: username
    }, '登录成功'));

  } catch (error) {
    console.error('Token 生成失败:', error);
    res.status(500).json(ResponseUtil.error('Token 生成失败'));
  }
});

/**
 * 验证 Token 接口
 * @route POST /onlyoffice/verify
 * @param {string} token - JWT token
 * @returns {Object} 验证结果
 */
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(ResponseUtil.error('Token 不能为空', 400));
    }

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    res.json(ResponseUtil.success({
      valid: true,
      username: decoded.username,
      timestamp: decoded.timestamp
    }, 'Token 有效'));

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(ResponseUtil.error('Token 无效', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ResponseUtil.error('Token 已过期', 401));
    }
    
    console.error('Token 验证失败:', error);
    res.status(500).json(ResponseUtil.error('Token 验证失败'));
  }
});

/**
 * 刷新 Token 接口
 * @route POST /onlyoffice/refresh
 * @param {string} token - 当前 JWT token
 * @returns {Object} 新的 token
 */
router.post('/refresh', (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(ResponseUtil.error('Token 不能为空', 400));
    }

    // 验证当前 token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 生成新的 token
    const newToken = jwt.sign(
      { 
        username: decoded.username,
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json(ResponseUtil.success({
      token: newToken,
      expiresIn: '24h',
      username: decoded.username
    }, 'Token 刷新成功'));

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(ResponseUtil.error('Token 无效', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ResponseUtil.error('Token 已过期', 401));
    }
    
    console.error('Token 刷新失败:', error);
    res.status(500).json(ResponseUtil.error('Token 刷新失败'));
  }
});

/**
 * 生成 OnlyOffice 配置 + 签名
 * @route POST /onlyoffice/config
 * @body {string} fileId 必填，附件上传返回的 id
 * @body {string} [mode] 可选，'view' | 'edit'，默认 'view'
 * @returns {Object} { config, token }，前端用于初始化 DocsAPI.DocEditor
 */
router.post('/config', authMiddleware, (req, res) => {
  try {
    const { fileId, mode = 'view' } = req.body || {};
    if (!fileId) {
      return res.status(400).json(ResponseUtil.error('fileId 不能为空', 400));
    }

    // 读取上传时保存的文件信息
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const infoPath = path.join(uploadsDir, `${fileId}.json`);
    if (!fs.existsSync(infoPath)) {
      return res.status(404).json(ResponseUtil.notFound('文件不存在'));
    }
    const fileInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
    
    // 生成仅供文档服务器拉取文件用的短期访问令牌
    const fileAccessToken = jwt.sign(
      { fileId, purpose: 'onlyoffice-file', username: req.user?.username },
      JWT_SECRET,
      { expiresIn: '30m' }
    );
    
    console.log('生成的 fileAccessToken:', fileAccessToken);
    console.log('使用的 JWT_SECRET:', JWT_SECRET);

    // 构造可被文档服务器访问的绝对 URL（使用用户登录 token）
    // const baseUrl = `${req.protocol}://${req.get('host')}`;
    const baseUrl = 'http://host.docker.internal:3005';
    const documentUrl = `${baseUrl}/attachment/onlyoffice/preview/${fileId}`;
    // const downloadUrl = `${baseUrl}/attachment/download/${fileId}`;

    // OnlyOffice 文档配置
    const documentKey = `${fileId}-${fileInfo.fileSize || ''}`; // 变化即认为是新版本
    const fileType = (fileInfo.extension || '').replace(/^\./, '');
    const ext = fileType.toLowerCase();
    const documentType = ['xls', 'xlsx', 'ods', 'csv'].includes(ext)
      ? 'cell'
      : ['ppt', 'pptx', 'odp'].includes(ext)
      ? 'slide'
      : 'word';
    const userDisplayName = req.user?.username || 'user';

    const config = {
      token: undefined, // 稍后填充签名
      document: {
        fileType: fileType,
        key: documentKey,
        title: fileInfo.fileName,
        url: documentUrl, // URL 中已包含 token 参数
        permissions: {
          edit: mode === 'edit',
          download: true,
          print: true,
          comment: mode !== 'view'
        }
      },
      documentType: documentType,
      editorConfig: {
        mode: mode === 'edit' ? 'edit' : 'view',
        lang: 'zh-CN',
        customization: {
          autosave: mode === 'edit',
          forcesave: false
        },
        user: {
          id: userDisplayName,
          name: userDisplayName
        },
        // 如需保存回调，可启用并实现回调接口
        // callbackUrl: `${baseUrl}/onlyoffice/callback/${fileId}?token=${fileAccessToken}`,
      },
      // 供前端在“另存为”时使用的下载地址参考
    //   urls: {
    //     download: downloadUrl
    //   }
    };

    // 生成给 OnlyOffice 使用的签名（前端应将其放在 config.token）
    const ooToken = jwt.sign(config, ONLYOFFICE_SECRET);
    config.token = ooToken;

    return res.json(ResponseUtil.success({ config }, '生成成功'));
  } catch (error) {
    console.error('OnlyOffice 配置生成失败:', error);
    return res.status(500).json(ResponseUtil.error('配置生成失败'));
  }
});

module.exports = router;
