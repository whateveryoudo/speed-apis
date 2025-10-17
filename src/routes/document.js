const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// 确保文档存储目录存在
const DOCS_DIR = path.join(__dirname, '../../docs');

// 获取所有文档列表
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return res.json({ documents: [] });
    }
    
    const files = fs.readdirSync(DOCS_DIR);
    const documents = files
      .filter(file => file.endsWith('.json'))
      .map(file => ({
        name: file.replace('.json', ''),
        path: file,
        lastModified: fs.statSync(path.join(DOCS_DIR, file)).mtime
      }));
    
    res.json({ documents });
  } catch (error) {
    res.status(500).json({ error: '获取文档列表失败', details: error.message });
  }
});

// 删除文档
router.delete('/:name', (req, res) => {
  try {
    const { name } = req.params;
    const filePath = path.join(DOCS_DIR, `${name}.json`);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: '文档已删除' });
    } else {
      res.status(404).json({ error: '文档不存在' });
    }
  } catch (error) {
    res.status(500).json({ error: '删除文档失败', details: error.message });
  }
});

module.exports = router;