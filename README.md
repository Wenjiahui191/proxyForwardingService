# Koa 请求转发服务

基于Koa的后端请求转发服务，将前端请求转发到聚合数据股票API (`http://web.juhe.cn/finance/stock`)。

## 功能特点

- 🚀 基于Koa框架，轻量高效
- 🔄 支持所有HTTP方法的请求转发
- 📡 自动转发查询参数和请求体
- 🛡️ 内置错误处理和CORS支持
- 📊 详细的请求日志记录
- 📝 智能日志系统（开发环境控制台，生产环境文件）
- 🗂️ 按天轮转的日志文件管理
- 🏥 健康检查接口

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动服务

```bash
npm start
```

服务将在 `http://localhost:3000` 启动。

### 开发模式

```bash
npm run dev
```

### 生产模式

```bash
npm run prod
```

## 日志系统

项目集成了智能日志系统，根据环境自动选择输出方式：

### 开发环境
- 所有日志直接输出到控制台
- 支持彩色输出便于调试
- 实时查看请求和错误信息

### 生产环境
- 日志自动写入 `logs/` 文件夹
- 按天自动轮转日志文件
- 分类存储不同级别的日志：
  - `app-YYYY-MM-DD.log` - 应用日志
  - `requests-YYYY-MM-DD.log` - 请求日志
  - `error-YYYY-MM-DD.log` - 错误日志
  - `exceptions-YYYY-MM-DD.log` - 异常日志
  - `rejections-YYYY-MM-DD.log` - Promise拒绝日志

### 日志配置
- 单个日志文件最大20MB
- 保留30天的历史日志
- 请求日志文件最大50MB（请求量大）

## 使用方法

### 基本转发
前端请求 `/hs` 将被转发到 `http://web.juhe.cn/finance/stock/hs`

```bash
# 示例请求
curl http://localhost:3000/hs?key=your_api_key&gid=sh000001

# 将转发到
# http://web.juhe.cn/finance/stock/hs?key=your_api_key&gid=sh000001
```

### 健康检查
```bash
curl http://localhost:3000/health
```

返回服务状态信息：
```json
{
  "status": "ok",
  "message": "Koa请求转发服务正常运行",
  "timestamp": "2025-07-06T12:00:00.000Z",
  "target": "http://web.juhe.cn/finance/stock"
}
```

## API说明

### 转发规则
- **路径转发**: `/path` → `http://web.juhe.cn/finance/stock/path`
- **方法支持**: GET, POST, PUT, DELETE等所有HTTP方法
- **参数保持**: 查询参数和请求体完整转发
- **头部过滤**: 自动过滤可能造成问题的请求头

### 错误处理
- 目标服务器错误会原样返回状态码和响应
- 网络错误返回500状态码和错误信息
- 所有错误都会在控制台输出日志

## 配置选项

### 环境变量
- `PORT`: 服务端口（默认3000）
- `NODE_ENV`: 运行环境（development | production）

### 环境配置文件
复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

示例配置：
```env
NODE_ENV=development
PORT=3000
```

### 目标服务器
在 `index.js` 中修改 `TARGET_BASE_URL` 常量来更改转发目标。

```javascript
const TARGET_BASE_URL = 'http://web.juhe.cn/finance/stock';
```

## 项目结构

```
nodeServerTransform/
├── index.js              # 主服务文件
├── logger.js             # 日志配置模块
├── package.json           # 项目配置
├── package-lock.json      # 依赖锁定文件
├── .env.example          # 环境配置示例
├── .gitignore            # Git忽略文件
├── README.md             # 项目文档
├── logs/                 # 日志文件夹（生产环境）
│   ├── app-YYYY-MM-DD.log
│   ├── requests-YYYY-MM-DD.log
│   ├── error-YYYY-MM-DD.log
│   ├── exceptions-YYYY-MM-DD.log
│   └── rejections-YYYY-MM-DD.log
└── .github/
    └── copilot-instructions.md  # Copilot指令
```

## 依赖说明

- **koa**: Web框架
- **koa-router**: 路由中间件
- **axios**: HTTP请求库
- **koa-bodyparser**: 请求体解析
- **koa-cors**: CORS支持
- **winston**: 专业日志库
- **winston-daily-rotate-file**: 日志文件按天轮转

## 开发说明

### 日志输出
**开发环境**（控制台输出）：
```
2025-07-06 12:00:00 [INFO]: 🚀 Koa请求转发服务启动成功!
2025-07-06 12:00:01 [INFO]: 192.168.1.100 "GET /hs?key=xxx&gid=sh000001" 200 150ms "Mozilla/5.0..."
2025-07-06 12:00:02 [INFO]: 转发请求: GET /hs?key=xxx&gid=sh000001 -> http://web.juhe.cn/finance/stock/hs
```

**生产环境**（文件输出）：
- 应用日志记录到 `logs/app-2025-07-06.log`
- 请求日志记录到 `logs/requests-2025-07-06.log`
- 错误日志记录到 `logs/error-2025-07-06.log`

### 错误日志
```
2025-07-06 12:00:00 [ERROR]: 转发请求失败: Request failed with status code 404
2025-07-06 12:00:01 [WARN]: 目标服务器错误: 404 - Not Found
```

## 许可证

ISC
