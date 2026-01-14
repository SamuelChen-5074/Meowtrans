// 简化版 popup.js - 用于测试

console.log('========================================');
console.log('popup-simple.js 开始加载');
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

console.log('DOM 元素检查:');
console.log('- providerSelect:', providerSelect);
console.log('- translateBtn:', translateBtn);
console.log('- saveSettingsBtn:', saveSettingsBtn);

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
  console.log('开始加载设置...');
  const result = await chrome.storage.local.get('translateSettings');
  const settings = result.translateSettings || defaultSettings;
  
  console.log('从存储加载的设置:', settings);
  
  providerSelect.value = settings.provider;
  ollamaUrlInput.value = settings.ollamaUrl;
  modelNameInput.value = settings.modelName;
  openrouterApiKeyInput.value = settings.openrouterApiKey;
  openrouterModelInput.value = settings.openrouterModel;
  openrouterSiteUrlInput.value = settings.openrouterSiteUrl;
  openrouterAppNameInput.value = settings.openrouterAppName;
  targetLangSelect.value = settings.targetLang;
  translateModeSelect.value = settings.translateMode;
  
  console.log('设置已填充到DOM');
  
  // 切换显示相应的设置面板
  toggleProviderSettings(settings.provider);
}

// 切换供应商设置面板
function toggleProviderSettings(provider) {
  console.log('切换供应商面板:', provider);
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
  console.log('保存设置...');
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
  
  console.log('保存的设置:', settings);
  
  await chrome.storage.local.set({ translateSettings: settings });
  showStatus('设置已保存', 'success');
}

// 显示状态信息
function showStatus(message, type = 'info') {
  console.log('显示状态:', message, type);
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
  }, 3000);
}

// 执行翻译
async function executeTranslate() {
  console.log('========================================');
  console.log('翻译按钮被点击');
  console.log('========================================');
  
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
    console.log('错误：OpenRouter API Key 为空');
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

// 事件监听
console.log('注册事件监听器...');

try {
  providerSelect.addEventListener('change', (e) => {
    console.log('供应商切换事件:', e.target.value);
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

  console.log('事件监听器注册完成');
} catch (error) {
  console.error('注册事件监听器失败:', error);
}

// 初始化
console.log('开始初始化...');
loadSettings();

console.log('popup-simple.js 加载完成');
