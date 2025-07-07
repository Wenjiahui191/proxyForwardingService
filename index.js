require('dotenv').config();
const Koa = require('koa');
const Router = require('koa-router');
const axios = require('axios');
const bodyParser = require('koa-bodyparser');
// const cors = require('@koa/cors');
const { logger, requestLogMiddleware } = require('./logger');

const app = new Koa();
const router = new Router();

// 配置中间件
// app.use(cors());
app.use(bodyParser());
app.use(requestLogMiddleware); // 添加请求日志中间件

// 目标API基础URL
const TARGET_BASE_URL = process.env.TARGET_BASE_URL || 'http://web.juhe.cn/finance';

// 延迟配置
const REQUEST_DELAY = parseInt(process.env.REQUEST_DELAY) || 300;
const ENABLE_DELAY = process.env.ENABLE_DELAY !== 'false' && process.env.NODE_ENV === 'development';

// 缓存配置
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 3600; // 秒
const cache = new Map(); // key: url+query, value: { data, expire }

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 请求转发中间件
const forwardRequest = async (ctx) => {
  logger.info(`接收到请求: ${ctx.method} ${ctx.originalUrl}`);
  try {
    // 获取请求路径（去掉开头的斜杠）
    const path = ctx.path.startsWith('/') ? ctx.path.substring(1) : ctx.path;
    // 构建目标URL
    const targetUrl = `${TARGET_BASE_URL}/${path}`;
    // 缓存key生成逻辑
    let cacheKey = '';
    if (ctx.method === 'GET') {
      // GET请求只考虑method+url+query
      cacheKey = `GET:${targetUrl}?${JSON.stringify(ctx.query)}`;
    } else {
      // 其他请求还需包含body
      cacheKey = `${ctx.method}:${targetUrl}?${JSON.stringify(ctx.query)}:${JSON.stringify(ctx.request.body || {})}`;
    }
    // 检查缓存
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expire > now) {
      logger.info(`缓存命中: ${ctx.method} ${ctx.originalUrl}，直接返回缓存数据`);
      ctx.status = 200;
      ctx.body = cached.data;
      return;
    }
    logger.info(`转发请求: ${ctx.method} ${ctx.originalUrl} -> ${targetUrl}`);
    // 准备请求配置
    const config = {
      method: ctx.method,
      url: targetUrl,
      params: ctx.query,
      headers: {
        ...ctx.headers,
        host: undefined,
        'x-forwarded-for': undefined,
        'x-forwarded-proto': undefined,
        'content-type': 'application/x-www-form-urlencoded',
      },
    };
    if (ctx.request.body && ['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
      config.data = ctx.request.body;
    }
    // 发送请求到目标服务器
    const response = await axios(config);
    // 模拟延迟（仅在开发环境生效）
    if (ENABLE_DELAY) {
      logger.info(`模拟延迟 ${REQUEST_DELAY}ms`);
      await delay(REQUEST_DELAY);
    }
    // 设置响应状态码
    ctx.status = response.status;
    // 设置响应头（过滤一些不需要的头）
    const excludeHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
    Object.keys(response.headers).forEach(key => {
      if (!excludeHeaders.includes(key.toLowerCase())) {
        ctx.set(key, response.headers[key]);
      }
    });
    // 转发响应数据打印
    logger.info(`转发响应: ${response.status} ${response.reason}`);
    // 设置响应体
    ctx.body = response.data;
    // 只缓存200响应
    if (response.status === 200) {
      cache.set(cacheKey, {
        data: response.data,
        expire: now + CACHE_TTL * 1000
      });
      logger.info(`响应已缓存: ${ctx.method} ${ctx.originalUrl}，有效期${CACHE_TTL}秒`);
    }
  } catch (error) {
    logger.error('转发请求失败:', error.message);
    if (error.response) {
      logger.warn(`目标服务器错误: ${error.response.status} - ${error.response.statusText}`);
      ctx.status = error.response.status;
      ctx.body = error.response.data || { error: '目标服务器错误' };
    } else {
      logger.error(`内部服务器错误: ${error.message}`);
      ctx.status = 500;
      ctx.body = {
        error: '内部服务器错误',
        message: error.message
      };
    }
  }
};

// 健康检查路由优先注册
const healthRouter = new Router();
healthRouter.get('/health', (ctx) => {
  logger.info('健康检查请求');
  ctx.body = {
    status: 'ok',
    message: 'Koa请求转发服务正常运行',
    timestamp: new Date().toISOString(),
    target: TARGET_BASE_URL
  };
});
app.use(healthRouter.routes());
app.use(healthRouter.allowedMethods());

// 设置路由 - 匹配所有路径
router.all('/(.*)', forwardRequest);

// 使用路由
app.use(router.routes());
app.use(router.allowedMethods());



// 错误处理
app.on('error', (err, ctx) => {
  logger.error('服务器错误:', err);
});

// 启动服务器
const PORT = process.env.PORT || 8808;
app.listen(PORT, () => {
  logger.info(`🚀 Koa请求转发服务启动成功!`);
  logger.info(`📡 服务地址: http://localhost:${PORT}`);
  logger.info(`🎯 转发目标: ${TARGET_BASE_URL}`);
  logger.info(`💡 示例: 访问 http://localhost:${PORT}/hs 将转发到 ${TARGET_BASE_URL}/hs`);
  logger.info(`🔍 健康检查: http://localhost:${PORT}/health`);
  logger.info(`📝 环境: ${process.env.NODE_ENV || 'development'}`);
  
  // 延迟配置信息
  if (ENABLE_DELAY) {
    logger.info(`⏱️  模拟延迟: 已启用 (${REQUEST_DELAY}ms)`);
  } else {
    logger.info(`⏱️  模拟延迟: 已禁用`);
  }
});
