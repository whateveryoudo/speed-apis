const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const ResponseUtil = require("../utils/response");
const fs = require("fs");
const path = require("path");
const { AUTH_JWT_SECRET, authMiddleware } = require("../config/auth");
const {
  ONLYOFFICE_JWT_SECRET,
  ONLYOFFICE_SERVER_URL,
} = require("../config/onlyoffice");

// 登录 JWT 密钥
const JWT_SECRET = AUTH_JWT_SECRET;
// OnlyOffice 文档服务器签名密钥
const ONLYOFFICE_SECRET = ONLYOFFICE_JWT_SECRET;

// 使用共享的认证中间件

/**
 * 生成 OnlyOffice 配置的公共函数
 * @param {Object} fileInfo - 文件信息
 * @param {string} fileId - 文件ID
 * @param {string} mode - 预览模式
 * @returns {Object} OnlyOffice 配置对象
 */
function generateOnlyOfficeConfig(fileInfo, fileId, mode) {
  // 生成文档配置
  const documentKey = `${fileId}-${fileInfo.fileSize || ""}`;
  const fileType = (fileInfo.extension || "").replace(/^\./, "");
  const ext = fileType.toLowerCase();
  console.log("ext", ext);
  // 根据OnlyOffice官方文档，只支持5种documentType
  // 图片和视频文件使用'word'类型，但会在前端特殊处理
  const documentType = ["xls", "xlsx", "ods", "csv"].includes(ext)
    ? "cell"
    : ["ppt", "pptx", "odp"].includes(ext)
    ? "slide"
    : "word";

  // 记录文件类型信息，用于前端判断
  const isImage = ["jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp"].includes(
    ext
  );
  const isVideo = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"].includes(
    ext
  );

  // 构造文件访问URL
  const baseUrl =
    isImage || isVideo
      ? "http://localhost:3005"
      : "http://host.docker.internal:3005";
  const documentUrl = `${baseUrl}/attachment/onlyoffice/preview/${fileId}`;

  // 生成 OnlyOffice 配置
  const config = {
    document: {
      fileType: fileType,
      key: documentKey,
      title: fileInfo.fileName,
      url: documentUrl,
      permissions: {
        edit: mode === "edit" && !isImage && !isVideo,
        download: true,
        print: !isVideo,
        comment: mode !== "view" && !isImage && !isVideo,
      },
    },
    documentType: documentType,
    editorConfig: {
      mode: mode === "edit" && !isImage && !isVideo ? "edit" : "view",
      lang: "zh-CN",
      customization: {
        autosave: mode === "edit" && !isImage && !isVideo,
        forcesave: false,
      },
      user: {
        id: "preview-user",
        name: "预览用户",
      },
    },
    downloadUrl: `${baseUrl}/attachment/onlyoffice/download/${fileId}`,
  };

  // 添加文件类型信息，供前端判断使用
  config.fileTypeInfo = {
    isImage,
    isVideo,
    originalExtension: ext,
  };

  // 生成签名
  const ooToken = jwt.sign(config, ONLYOFFICE_SECRET);
  config.token = ooToken;

  return config;
}

/**
 * 读取文件信息的公共函数
 * @param {string} fileId - 文件ID
 * @returns {Object} 文件信息
 */
function getFileInfo(fileId) {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const infoPath = path.join(uploadsDir, `${fileId}.json`);

  if (!fs.existsSync(infoPath)) {
    throw new Error("文件不存在");
  }

  return JSON.parse(fs.readFileSync(infoPath, "utf8"));
}

/**
 * 验证 Token 接口
 * @route POST /onlyoffice/verify
 * @param {string} token - JWT token
 * @returns {Object} 验证结果
 */
router.post("/verify", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(ResponseUtil.error("Token 不能为空", 400));
    }

    // 验证 token
    const decoded = jwt.verify(token, JWT_SECRET);

    res.json(
      ResponseUtil.success(
        {
          valid: true,
          username: decoded.username,
          timestamp: decoded.timestamp,
        },
        "Token 有效"
      )
    );
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json(ResponseUtil.error("Token 无效", 401));
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(ResponseUtil.error("Token 已过期", 401));
    }

    console.error("Token 验证失败:", error);
    res.status(500).json(ResponseUtil.error("Token 验证失败"));
  }
});

/**
 * 刷新 Token 接口
 * @route POST /onlyoffice/refresh
 * @param {string} token - 当前 JWT token
 * @returns {Object} 新的 token
 */
router.post("/refresh", (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json(ResponseUtil.error("Token 不能为空", 400));
    }

    // 验证当前 token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 生成新的 token
    const newToken = jwt.sign(
      {
        username: decoded.username,
        timestamp: Date.now(),
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json(
      ResponseUtil.success(
        {
          token: newToken,
          expiresIn: "24h",
          username: decoded.username,
        },
        "Token 刷新成功"
      )
    );
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json(ResponseUtil.error("Token 无效", 401));
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json(ResponseUtil.error("Token 已过期", 401));
    }

    console.error("Token 刷新失败:", error);
    res.status(500).json(ResponseUtil.error("Token 刷新失败"));
  }
});

/**
 * 生成 OnlyOffice 配置 + 签名
 * @route POST /onlyoffice/config
 * @body {string} fileId 必填，附件上传返回的 id
 * @body {string} [mode] 可选，'view' | 'edit'，默认 'view'
 * @returns {Object} { config, token }，前端用于初始化 DocsAPI.DocEditor
 */
router.post("/config", authMiddleware, (req, res) => {
  try {
    const { fileId, mode = "view" } = req.body || {};
    if (!fileId) {
      return res.status(400).json(ResponseUtil.error("fileId 不能为空", 400));
    }

    // 读取文件信息
    const fileInfo = getFileInfo(fileId);

    // 生成 OnlyOffice 配置
    const config = generateOnlyOfficeConfig(fileInfo, fileId, mode);

    return res.json(ResponseUtil.success({ config }, "生成成功"));
  } catch (error) {
    console.error("OnlyOffice 配置生成失败:", error);
    return res.status(500).json(ResponseUtil.error("配置生成失败"));
  }
});

/**
 * 提供 OnlyOffice 预览页面（支持大多数文件类型）
 * @route GET /onlyoffice/filePreview/:fileId
 * @param {string} fileId - 文件ID
 * @query {string} [mode] - 预览模式，'view' 或 'edit'，默认 'view'
 * @returns {string} HTML 页面
 */
router.get("/filePreview/:fileId", authMiddleware, (req, res) => {
  try {
    const { fileId } = req.params;
    const { mode = "view" } = req.query;

    if (!fileId) {
      return res.status(400).send("文件ID不能为空");
    }

    // 读取文件信息
    const fileInfo = getFileInfo(fileId);

    // 生成 OnlyOffice 配置
    const config = generateOnlyOfficeConfig(fileInfo, fileId, mode);

    // 使用 EJS 模板渲染页面
    res.render("onlyoffice/preview", {
      fileName: fileInfo.fileName || "未知文件",
      fileSizeMB: fileInfo.fileSize
        ? (fileInfo.fileSize / 1024 / 1024).toFixed(2)
        : "0",
      fileType:
        (fileInfo.extension || "").replace(/^\./, "").toUpperCase() || "未知",
      modeText: mode === "edit" ? "编辑" : "预览",
      onlyofficeServerUrl: ONLYOFFICE_SERVER_URL,
      configJson: JSON.stringify(config, null, 2),
    });
  } catch (error) {
    console.error("预览页面生成失败:", error);
    res.status(500).send("预览页面生成失败");
  }
});

module.exports = router;
