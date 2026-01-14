# 调试指南

本文档帮助您诊断和解决翻译插件的问题。

## 启用调试日志

插件已内置调试日志，您可以通过以下方式查看：

### 方法 1：浏览器控制台（推荐）

1. 打开插件弹窗
2. 按 `F12` 打开开发者工具
3. 切换到 "Console" 标签
4. 点击"翻译"按钮
5. 查看控制台输出的日志信息

### 方法 2：扩展页面

1. 访问 `chrome://extensions/`
2. 找到 "Ollama 网页翻译" 插件
3. 点击 "检查视图" 或 "错误" 按钮
4. 查看详细的错误信息

## 常见问题诊断

### 问题 1：点击翻译按钮没有任何反应

**可能原因**：
- JavaScript 错误导致脚本崩溃
- 事件监听器未正确绑定
- DOM 元素未正确加载

**诊断步骤**：
1. 打开浏览器控制台（F12）
2. 点击"翻译"按钮
3. 查看是否有错误信息

**预期日志**：
```
开始翻译...
翻译设置: {provider: 'ollama', ollamaUrl: 'http://localhost:11434', ...}
发送消息到标签页: 123456789
收到响应: {success: true, ...}
```

**解决方法**：
- 如果看到错误，根据错误信息修复
- 如果没有任何日志，检查popup.js是否正确加载
- 尝试刷新扩展页面：`chrome://extensions/` → 点击刷新按钮

---

### 问题 2：设置无法保存

**可能原因**：
- Chrome存储权限问题
- 存储空间不足
- 异步操作未正确处理

**诊断步骤**：
1. 打开浏览器控制台
2. 点击"保存设置"按钮
3. 查看控制台日志

**预期日志**：
```
保存设置...
设置已保存
```

**解决方法**：
- 检查manifest.json中是否有storage权限
- 清除浏览器缓存
- 尝试重新安装插件

---

### 问题 3：OpenRouter API 调用失败

**可能原因**：
- API Key 无效或过期
- 网络连接问题
- API 端点不可用
- 模型名称错误

**诊断步骤**：
1. 选择"OpenRouter (云端)"供应商
2. 输入有效的 API Key
3. 点击"翻译"按钮
4. 查看控制台日志

**预期日志**：
```
开始翻译...
翻译设置: {provider: 'openrouter', openrouterApiKey: 'sk-or-...', ...}
发送消息到标签页: 123456789
收到响应: {success: true, ...}
```

**错误日志示例**：
```
OpenRouter API 错误: 401 Unauthorized
OpenRouter API 错误: Invalid API key
```

**解决方法**：
- 验证 API Key 是否正确：访问 https://openrouter.ai/keys
- 检查网络连接
- 确认模型名称是否正确
- 查看OpenRouter账户余额

---

### 问题 4：Ollama 连接失败

**可能原因**：
- Ollama 服务未启动
- 端口配置错误
- 防火墙阻止连接

**诊断步骤**：
1. 选择"Ollama (本地)"供应商
2. 点击"翻译"按钮
3. 查看控制台日志

**预期日志**：
```
开始翻译...
翻译设置: {provider: 'ollama', ollamaUrl: 'http://localhost:11434', ...}
发送消息到标签页: 123456789
收到响应: {success: true, ...}
```

**错误日志示例**：
```
Ollama API 错误: Connection refused
Ollama API 错误: 404 Not Found
```

**解决方法**：
- 确认 Ollama 服务正在运行：`ollama serve`
- 检查服务地址是否正确
- 测试连接：在浏览器访问 `http://localhost:11434/api/tags`
- 检查防火墙设置

---

### 问题 5：翻译模式不工作

**可能原因**：
- Content script 未注入
- 消息传递失败
- 翻译函数未正确实现

**诊断步骤**：
1. 刷新当前网页
2. 选择不同的翻译模式
3. 点击"翻译"按钮
4. 查看控制台日志

**预期日志**：
```
收到消息: {action: 'translate', settings: {...}}
执行选中文字翻译
```

**解决方法**：
- 刷新网页
- 重新加载插件
- 检查content.js是否正确注入

---

## 手动测试 API

### 测试 Ollama API

在浏览器控制台中运行：

```javascript
fetch('http://localhost:11434/api/tags')
  .then(r => r.json())
  .then(d => console.log('可用模型:', d.models))
  .catch(e => console.error('错误:', e));
```

### 测试 OpenRouter API

在浏览器控制台中运行（替换YOUR_API_KEY）：

```javascript
fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-3-haiku',
    messages: [{role: 'user', content: '测试'}]
  })
})
  .then(r => r.json())
  .then(d => console.log('响应:', d))
  .catch(e => console.error('错误:', e));
```

## 检查清单

在报告问题前，请确认以下内容：

### 基础检查

- [ ] 插件已正确安装（chrome://extensions/）
- [ ] 插件已启用（未显示"已停用"）
- [ ] 图标文件存在（icons/icon16.png等）
- [ ] 浏览器控制台可以打开（F12）

### Ollama 检查

- [ ] Ollama 服务正在运行
- [ ] 可以访问 http://localhost:11434
- [ ] 已下载翻译模型
- [ ] 模型名称配置正确

### OpenRouter 检查

- [ ] 已获取有效的 API Key
- [ ] API Key 未过期
- [ ] 账户有足够余额
- [ ] 模型名称配置正确

### 功能检查

- [ ] 选中文字翻译可以工作
- [ ] 整个页面翻译可以工作
- [ ] 悬停翻译可以工作
- [ ] 右键菜单选项可用
- [ ] 设置可以保存和加载

## 获取帮助

如果以上步骤无法解决问题：

1. **收集信息**：
   - 浏览器版本
   - 操作系统
   - 完整的错误日志
   - 复现步骤

2. **查看文档**：
   - [README.md](README.md)
   - [INSTALL.md](INSTALL.md)
   - [QUICKSTART.md](QUICKSTART.md)

3. **提交问题**：
   - 访问项目仓库
   - 创建新的 Issue
   - 附上完整的错误日志

## 开发者调试

如果您是开发者，可以：

1. 在代码中添加更多 `console.log()`
2. 使用 Chrome DevTools 断点调试
3. 检查 Network 标签查看 API 请求
4. 使用 Chrome 扩展调试工具

## 清除数据

如果需要重置所有设置：

1. 打开浏览器控制台
2. 运行以下代码：

```javascript
chrome.storage.local.clear(() => {
  console.log('所有设置已清除');
  location.reload();
});
```

3. 重新配置插件设置
