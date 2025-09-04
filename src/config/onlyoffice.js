// OnlyOffice 文档服务器签名秘钥（建议改为从环境变量读取）
const ONLYOFFICE_JWT_SECRET = process.env.ONLYOFFICE_JWT_SECRET;
const ONLYOFFICE_SERVER_URL = process.env.ONLYOFFICE_SERVER_URL;
module.exports = {
  ONLYOFFICE_JWT_SECRET,
  ONLYOFFICE_SERVER_URL
};


