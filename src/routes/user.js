const ResponseUtil = require("../utils/response");
const express = require("express");
const router = express.Router();
const jwt = require('jsonwebtoken');
const { AUTH_JWT_SECRET } = require("../config/auth");
// 用户信息（实际项目中应该从数据库获取）
const VALID_USER = {
  username: "ykx",
  password: "123456",
};
/**
 * 生成 JWT Token 接口
 * @route POST /onlyoffice/login
 * @param {string} username - 用户名
 * @param {string} password - 密码
 * @returns {Object} 包含 token 的响应
 */
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证用户名和密码
    if (!username || !password) {
      return res
        .status(400)
        .json(ResponseUtil.error("用户名和密码不能为空", 400));
    }

    if (username !== VALID_USER.username || password !== VALID_USER.password) {
      return res.status(401).json(ResponseUtil.error("用户名或密码错误", 401));
    }

    // 生成 JWT token，有效期 24 小时
    const token = jwt.sign(
      {
        username: username,
        timestamp: Date.now(),
      },
      AUTH_JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json(
      ResponseUtil.success(
        {
          token: token,
          expiresIn: "24h",
          username: username,
        },
        "登录成功"
      )
    );
  } catch (error) {
    console.error("Token 生成失败:", error);
    res.status(500).json(ResponseUtil.error("Token 生成失败"));
  }
});

module.exports = router;
