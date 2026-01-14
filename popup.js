// 立即执行的测试日志
console.log('========================================');
console.log('popup.js 开始执行 - 这条日志应该立即显示');
console.log('========================================');

// 获取DOM元素
const providerSelect = document.getElementById('provider');
const ollamaUrlInput = document.getElementById('ollama-url');
const modelNameInput = document.getElementById('model-name');
const openrouterApiKeyInput = document.getElementById('openrouter-api-key');
const openrouterModelInput = document.getElementById('openrouter-model');
const openrouterSiteUrlInput = document.getElementById('openrouter-site-url');
const openrouterAppNameInput = document.getElementById('openrouter-app-name');
const targetLangSelect = document.getElementById('target-lang');
const translateModeSelect = document.getElementById('translate-mode');
const translateBtn = document.getElementById('translate-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const statusDiv = document.getElementById('status');

const ollamaSettingsDiv = document.getElementById('ollama-settings');
const openrouterSettingsDiv = document.getElementById('openrouter-settings');

// 默认设置
const defaultSettings = {
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  modelName: 'qwen2:7b',
  openrouterApiKey: '',
  openrouterModel: 'anthropic/claude-3-haiku',
  openrouterSiteUrl: '',
  openrouterAppName: 'Ollama 翻译插件',
  targetLang: '中文',
  translateMode: 'selected'
};

// 加载保存的设置
async function loadSettings() {
  const result = await chrome.storage.local.get('translateSettings');
  const settings = result.translateSettings || defaultSettings;
  
  providerSelect.value = settings.provider;
  ollamaUrlInput.value = settings.ollamaUrl;
  modelNameInput.value = settings.modelName;
  openrouterApiKeyInput.value = settings.openrouterApiKey;
  openrouterModelInput.value = settings.openrouterModel;
  openrouterSiteUrlInput.value = settings.openrouterSiteUrl;
  openrouterAppNameInput.value = settings.openrouterAppName;
  targetLangSelect.value = settings.targetLang;
  translateModeSelect.value = settings.translateMode;
  
  // 切换显示相应的设置面板
  toggleProviderSettings(settings.provider);
}

// 切换供应商设置面板
function toggleProviderSettings(provider) {
  if (provider === 'ollama') {
    ollamaSettingsDiv.style.display = 'block';
    openrouterSettingsDiv.style.display = 'none';
  } else if (provider === 'openrouter') {
    ollamaSettingsDiv.style.display = 'none';
    openrouterSettingsDiv.style.display = 'block';
  }
}

// 保存设置
async function saveSettings() {
  const settings = {
    provider: providerSelect.value,
    ollamaUrl: ollamaUrlInput.value.trim(),
    modelName: modelNameInput.value.trim(),
    openrouterApiKey: openrouterApiKeyInput.value.trim(),
    openrouterModel: openrouterModelInput.value.trim(),
    openrouterSiteUrl: openrouterSiteUrlInput.value.trim(),
    openrouterAppName: openrouterAppNameInput.value.trim(),
    targetLang: targetLangSelect.value,
    translateMode: translateModeSelect.value
  };
  
  await chrome.storage.local.set({ translateSettings: settings });
  showStatus('设置已保存', 'success');
}

// 显示状态信息
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
  }, 3000);
}

// 调用Ollama API进行翻译
async function translateWithOllama(text, settings) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;
  
  const response = await fetch(`${settings.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.modelName,
      prompt: prompt,
      stream: false
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama API 错误: ${response.status}`);
  }
  
  const data = await response.json();
  return data.response.trim();
}

// 调用OpenRouter API进行翻译
async function translateWithOpenRouter(text, settings) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${settings.openrouterApiKey}`,
    'HTTP-Referer': settings.openrouterSiteUrl || 'https://localhost',
    'X-Title': settings.openrouterAppName || 'Ollama 翻译插件'
  };
  
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: settings.openrouterModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenRouter API 错误: ${errorData.error?.message || response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// 根据供应商调用相应的翻译API
async function translateWithProvider(text, settings) {
  if (settings.provider === 'openrouter') {
    return await translateWithOpenRouter(text, settings);
  } else {
    return await translateWithOllama(text, settings);
  }
}

// 执行翻译
async function executeTranslate() {
  console.log('开始翻译...');
  
  const settings = {
    provider: providerSelect.value,
    ollamaUrl: ollamaUrlInput.value.trim(),
    modelName: modelNameInput.value.trim(),
    openrouterApiKey: openrouterApiKeyInput.value.trim(),
    openrouterModel: openrouterModelInput.value.trim(),
    openrouterSiteUrl: openrouterSiteUrlInput.value.trim(),
    openrouterAppName: openrouterAppNameInput.value.trim(),
    targetLang: targetLangSelect.value,
    translateMode: translateModeSelect.value
  };
  
  console.log('翻译设置:', settings);
  
  // 验证配置
  if (settings.provider === 'openrouter' && !settings.openrouterApiKey) {
    showStatus('请输入 OpenRouter API Key', 'error');
    return;
  }
  
  showStatus('正在翻译...', 'info');
  
  try {
    // 获取当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('无法获取当前标签页');
    }
    
    console.log('发送消息到标签页:', tab.id);
    
    // 向content script发送消息
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'translate',
      settings: settings
    });
    
    console.log('收到响应:', response);
    
    if (response.success) {
      showStatus('翻译完成', 'success');
    } else {
      throw new Error(response.error || '翻译失败');
    }
  } catch (error) {
    console.error('翻译错误:', error);
    showStatus(`错误: ${error.message}`, 'error');
  }
}

// 测试Ollama连接
async function testOllamaConnection() {
  const ollamaUrl = ollamaUrlInput.value.trim();
  
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('连接失败');
    }
    const data = await response.json();
    return { success: true, models: data.models };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 事件监听
providerSelect.addEventListener('change', (e) => {
  console.log('供应商切换:', e.target.value);
  toggleProviderSettings(e.target.value);
});

saveSettingsBtn.addEventListener('click', () => {
  console.log('保存设置按钮被点击');
  saveSettings();
});

translateBtn.addEventListener('click', () => {
  console.log('翻译按钮被点击');
  executeTranslate();
});

// 初始化
console.log('popup.js 加载完成，开始初始化...');
loadSettings();

// 检查Ollama连接状态
async function checkConnection() {
  const result = await testOllamaConnection();
  if (result.success) {
    console.log('Ollama连接成功，可用模型:', result.models);
  } else {
    console.warn('Ollama连接失败:', result.error);
  }
}

checkConnection();
