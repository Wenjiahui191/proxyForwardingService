const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// 获取环境变量，默认为开发环境
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// 日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// 请求日志格式
const requestLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, message }) => {
    return `${timestamp} ${message}`;
  })
);

// 创建日志传输器数组
const transports = [];

// 开发环境：输出到控制台
if (!isProduction) {
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  );
}

// 生产环境：输出到文件
if (isProduction) {
  // 确保日志目录存在
  const logDir = path.join(__dirname, 'logs');
  
  // 应用日志 - 按天轮转
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'info'
    })
  );
  
  // 错误日志 - 按天轮转
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: logFormat,
      level: 'error'
    })
  );
}

// 创建主日志器
const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: logFormat,
  transports,
  // 捕获未处理的异常和拒绝
  exceptionHandlers: isProduction ? [
    new DailyRotateFile({
      filename: path.join(__dirname, 'logs', 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ] : [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ],
  rejectionHandlers: isProduction ? [
    new DailyRotateFile({
      filename: path.join(__dirname, 'logs', 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ] : [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    })
  ]
});

// 创建请求日志器（单独的日志文件）
const requestLogger = winston.createLogger({
  format: requestLogFormat,
  transports: isProduction ? [
    new DailyRotateFile({
      filename: path.join(__dirname, 'logs', 'requests-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '50m',
      maxFiles: '30d'
    })
  ] : [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        requestLogFormat
      )
    })
  ]
});

// 请求日志中间件
const requestLogMiddleware = async (ctx, next) => {
  const start = Date.now();
  const { method, originalUrl, ip } = ctx;
  const userAgent = ctx.get('user-agent') || '';
  
  try {
    await next();
    
    const duration = Date.now() - start;
    const { status } = ctx;
    
    // 记录请求日志
    const logMessage = `${ip} "${method} ${originalUrl}" ${status} ${duration}ms "${userAgent}"`;
    
    if (status >= 400) {
      requestLogger.warn(logMessage);
    } else {
      requestLogger.info(logMessage);
    }
    
  } catch (error) {
    const duration = Date.now() - start;
    const status = error.status || 500;
    
    // 记录错误请求
    const logMessage = `${ip} "${method} ${originalUrl}" ${status} ${duration}ms "${userAgent}" - ERROR: ${error.message}`;
    requestLogger.error(logMessage);
    
    throw error;
  }
};

// 导出日志器和中间件
module.exports = {
  logger,
  requestLogger,
  requestLogMiddleware
};
