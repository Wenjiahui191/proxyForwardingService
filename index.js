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

// 请求转发中间件
const forwardRequest = async (ctx) => {

  logger.info(`接收到请求: ${ctx.method} ${ctx.originalUrl}`);
  try {
    // 获取请求路径（去掉开头的斜杠）
    const path = ctx.path.startsWith('/') ? ctx.path.substring(1) : ctx.path;
    
    // 构建目标URL
    const targetUrl = `${TARGET_BASE_URL}/${path}`;
    
    logger.info(`转发请求: ${ctx.method} ${ctx.originalUrl} -> ${targetUrl}`);
    
    // 准备请求配置
    const config = {
      method: ctx.method,
      url: targetUrl,
      params: ctx.query,
      headers: {
        ...ctx.headers,
        // 移除host等可能造成问题的headers
        host: undefined,
        'x-forwarded-for': undefined,
        'x-forwarded-proto': undefined,
        'content-type': 'application/x-www-form-urlencoded',
      },
    };
    
    // 如果有请求体，添加到配置中
    if (ctx.request.body && ['POST', 'PUT', 'PATCH'].includes(ctx.method)) {
      config.data = ctx.request.body;
    }
    
    // 发送请求到目标服务器
    const response = await axios(config);
    
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
    
  } catch (error) {
    logger.error('转发请求失败:', error.message);
    
    if (error.response) {
      // 目标服务器返回了错误响应
      logger.warn(`目标服务器错误: ${error.response.status} - ${error.response.statusText}`);
      ctx.status = error.response.status;
      ctx.body = error.response.data || { error: '目标服务器错误' };
    } else {
      // 网络错误或其他错误
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
});
