const axios = require('axios');

// 测试服务的基本功能和日志记录
async function testServer() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🧪 开始测试Koa请求转发服务...\n');
  
  try {
    // 测试健康检查
    console.log('1. 测试健康检查接口...');
    const healthResponse = await axios.get(`${baseUrl}/health`);
    console.log('✅ 健康检查成功:', healthResponse.data.message);
    
    // 测试请求转发（这个会失败，但可以测试错误日志）
    console.log('\n2. 测试请求转发（预期会失败，用于测试错误日志）...');
    try {
      await axios.get(`${baseUrl}/test`, { timeout: 5000 });
    } catch (error) {
      console.log('⚠️ 预期的转发错误:', error.response ? error.response.status : error.code);
    }
    
    // 测试POST请求
    console.log('\n3. 测试POST请求转发...');
    try {
      await axios.post(`${baseUrl}/test`, { test: 'data' }, { timeout: 5000 });
    } catch (error) {
      console.log('⚠️ 预期的POST请求错误:', error.response ? error.response.status : error.code);
    }
    
    console.log('\n✅ 测试完成！请检查控制台日志输出。');
    console.log('💡 如果在生产环境运行，请检查 logs/ 文件夹中的日志文件。');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('🔍 请确保服务已启动：npm start');
  }
}

// 延迟执行，给服务器启动时间
setTimeout(testServer, 2000);
