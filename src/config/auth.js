require('dotenv').config();
const jwt = require('jsonwebtoken');
const ResponseUtil = require('../utils/response');

// 通用登录 JWT 秘钥（建议改为从环境变量读取）
const AUTH_JWT_SECRET = process.env.AUTH_JWT_SECRET;
const ONLYOFFICE_JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET;
console.log('AUTH_JWT_SECRET:', AUTH_JWT_SECRET);
// 通用认证中间件（处理用户登录 token）
const authMiddleware = (req, res, next) => {
  try {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const queryToken = req.query.token;
    const token = headerToken || queryToken;
    
    if (!token) {
      return res.status(401).json(ResponseUtil.error('未提供认证令牌', 401));
    }
    
    const decoded = jwt.verify(token, AUTH_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(ResponseUtil.error('认证令牌无效', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ResponseUtil.error('认证令牌已过期', 401));
    }
    return res.status(401).json(ResponseUtil.error('认证失败', 401));
  }
};

// OnlyOffice 专用认证中间件
const onlyofficeAuthMiddleware = (req, res, next) => {
  try {
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const queryToken = req.query.token;
    const token = headerToken || queryToken;
    
    if (!token) {
      return res.status(401).json(ResponseUtil.error('未提供认证令牌', 401));
    }
    
    // 直接用 ONLYOFFICE_JWT_SECRET 验证
    const decoded = jwt.verify(token, ONLYOFFICE_JWT_SECRET);
    
    // OnlyOffice 配置签名 token 验证通过，说明用户有权限访问
    // console.log('OnlyOffice 文件访问验证通过:', { 
    //   fileId: req.params.fileId, 
    //   url: decoded.payload?.url 
    // });
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(ResponseUtil.error('认证令牌无效', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(ResponseUtil.error('认证令牌已过期', 401));
    }
    return res.status(401).json(ResponseUtil.error('认证失败', 401));
  }
};

module.exports = {
  AUTH_JWT_SECRET,
  authMiddleware,
  onlyofficeAuthMiddleware
};


