<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Koa 请求转发服务项目指令

这是一个基于Koa的Node.js项目，用于将前端请求转发到聚合数据API。

## 项目特点
- 使用Koa框架构建轻量级服务器
- 支持所有HTTP方法的请求转发
- 自动处理查询参数和请求体
- 包含错误处理和日志记录
- 提供健康检查接口

## 编码规范
- 使用ES6+语法
- 遵循Node.js最佳实践
- 添加适当的错误处理
- 包含详细的日志输出
- 保持代码简洁易读

## API设计
- 所有路径都会被转发到目标服务器
- 保持原始请求的方法、参数和头部信息
- 过滤掉可能造成问题的请求头
- 返回目标服务器的响应数据
