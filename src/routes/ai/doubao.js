const express = require('express');
const axios = require('axios');
const router = express.Router();
const { authMiddleware } = require('../../config/auth');

// 火山引擎 API 配置
const VOLC_API_KEY = process.env.VOLC_API_KEY;
const VOLC_ENDPOINT = process.env.VOLC_ENDPOINT;
const VOLC_MODEL = process.env.VOLC_MODEL;

/**
 * AI 文本处理 - 通用接口
 */
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const { action, content, customPrompt } = req.body;

    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    // 根据不同的 action 构建不同的 prompt
    const systemPrompts = {
      refactor: '你是一位专业的写作助手。请改进以下文本，使其更加流畅、专业和易读。保持原意，只输出改进后的文本内容，不要添加任何解释。',
      check: '你是一位语法检查专家。请检查以下文本的拼写和语法错误，并直接输出修正后的文本。如果没有错误，输出原文。',
      simple: '你是一位内容编辑。请将以下文本简化，使其更加简洁明了，保留核心意思。只输出简化后的文本。',
      rich: '你是一位内容创作者。请丰富以下文本内容，添加更多细节和描述，使其更加生动具体。只输出丰富后的文本。',
      translate: '你是一位翻译专家。如果文本是中文，翻译成英文；如果是英文，翻译成中文。只输出翻译结果。',
      summary: '你是一位总结专家。请总结以下文本的核心要点，用简洁的语言概括主要内容。只输出总结内容。',
      custom: customPrompt || '请处理以下文本：'
    };

    const systemPrompt = systemPrompts[action] || systemPrompts.custom;
    console.log(`${VOLC_ENDPOINT}/chat/completions`)
    // 调用火山引擎 API
    const response = await axios.post(
      `${VOLC_ENDPOINT}/chat/completions`,
      {
        model: VOLC_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VOLC_API_KEY}`
        },
        timeout: 30000 // 30秒超时
      }
    );

    // 返回处理结果
    res.json({
      success: true,
      result: response.data.choices[0].message.content,
      usage: response.data.usage
    });

  } catch (error) {
    console.error('AI 处理错误:', error.response?.data || error.message);
    res.status(500).json({
      error: 'AI 处理失败',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * AI 流式处理接口 - 支持 SSE (Server-Sent Events)
 */
router.post('/stream', authMiddleware, async (req, res) => {
  try {
    const { action, content, customPrompt } = req.body;

    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    const systemPrompts = {
      refactor: '你是一位专业的写作助手。请改进以下文本，使其更加流畅、专业和易读。保持原意，只输出改进后的文本内容，不要添加任何解释。',
      check: '你是一位语法检查专家。请检查以下文本的拼写和语法错误，并直接输出修正后的文本。如果没有错误，输出原文。',
      simple: '你是一位内容编辑。请将以下文本简化，使其更加简洁明了，保留核心意思。只输出简化后的文本。',
      rich: '你是一位内容创作者。请丰富以下文本内容，添加更多细节和描述，使其更加生动具体。只输出丰富后的文本。',
      translate: '你是一位翻译专家。如果文本是中文，翻译成英文；如果是英文，翻译成中文。只输出翻译结果。',
      summary: '你是一位总结专家。请总结以下文本的核心要点，用简洁的语言概括主要内容。只输出总结内容。',
      custom: customPrompt || '请处理以下文本：'
    };

    const systemPrompt = systemPrompts[action] || systemPrompts.custom;

        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
        // 发送初始数据，确保连接建立
        res.write(':ok\n\n');
        if (res.flush) res.flush();
    console.log(`${VOLC_ENDPOINT}/chat/completions`);
    // 调用火山引擎流式 API
    const response = await axios.post(
      `${VOLC_ENDPOINT}/chat/completions`,
      {
        model: VOLC_MODEL,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: content
          }
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VOLC_API_KEY}`
        },
        responseType: 'stream',
        timeout: 60000
      }
    );

    // ✅ 直接转发流式数据到前端（更简单！）
    response.data.on('data', (chunk) => {
      res.write(chunk);  // 直接转发原始数据
      if (res.flush) res.flush();  // 立即发送
    });

    response.data.on('end', () => {
      res.end();
    });

    response.data.on('error', (error) => {
      console.error('流式传输错误:', error);
      res.write(`data: ${JSON.stringify({ error: '传输错误' })}\n\n`);
      res.end();
    });

  } catch (error) {
    console.error('AI 流式处理错误:', error.response?.data || error.message);
    res.status(500).json({
      error: 'AI 流式处理失败',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

/**
 * 健康检查接口
 */
router.get('/health', authMiddleware, (req, res) => {
  res.json({
    status: 'ok',
    service: 'AI Service',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

