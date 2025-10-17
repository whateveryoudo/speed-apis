// 创建数据库连接
const { createPool } = require('mysql2/promise');

const pool = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});


const testconnect = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('数据库连接成功')
        connection.release();
    } catch (error) {
        console.log('数据库连接失败', error);
        process.exit(1);
    }
}
module.exports = {
    pool,
    testconnect
}