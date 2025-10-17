const { Hocuspocus } = require('@hocuspocus/server');
const fs = require('fs');
const path = require('path');
const { pool } = require('../db');
const { Database } = require('@hocuspocus/extension-database');
// 确保文档存储目录存在
const DOCS_DIR = path.join(__dirname, '../../docs');
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log(`文档目录已创建: ${DOCS_DIR}`);
}

// 配置Hocuspocus服务器
const hocuspocusServer = new Hocuspocus({
    name: 'Speed Editor Collaboration Server',

    // 认证配置
    // authentication: {
    //     async token(context) {
    //         // 从context中获取文档名
    //         const documentName = context.requestParameters.documentName || context.documentName || 'default';
    //         console.log('认证请求:', { documentName, user: context.user });

    //         // 返回token数据
    //         return {
    //             documentName: documentName,
    //             user: context.user || { id: 'anonymous', name: '匿名用户' }
    //         };
    //     }
    // },
    // 采用扩展存储获取文档
    extensions: [
        new Database({
            // 读取
            async fetch({ documentName }) {
                console.log(`读取文档: ${documentName}`);
                const [rows] = await pool.execute('SELECT data FROM documents WHERE name = ?', [documentName]);
                
                if (rows.length > 0) {
                    
                    return rows[0].data;
                }
                console.log(`文档不存在，创建新文档: ${documentName}`);
                return null;
            },
            // 写入
            async store({ documentName, state }) {
                console.log(`保存文档: ${documentName} (${state.length} bytes)`);
                const [result] = await pool.execute('INSERT INTO documents (name, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)', [documentName, state]);
                if (result.affectedRows > 0) {
                    console.log(`文档已保存: ${documentName}`);
                } else {
                    console.error(`文档保存失败: ${documentName}`);
                }
            },

        })
    ],
    // 启用调试日志
    debug: true
});

// 导出Hocuspocus服务器实例
module.exports = hocuspocusServer;