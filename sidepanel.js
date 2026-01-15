// Side Panel 特定逻辑 - 复用 popup.js 的功能

// 获取DOM元素
const providerSelect = document.getElementById('provider');
const ollamaUrlInput = document.getElementById('ollama-url');
const modelNameInput = document.getElementById('model-name');
const openrouterApiKeyInput = document.getElementById('openrouter-api-key');
const openrouterModelInput = document.getElementById('openrouter-model');
const openrouterSiteUrlInput = document.getElementById('openrouter-site-url');
const openrouterAppNameInput = document.getElementById('openrouter-app-name');
const openaiApiKeyInput = document.getElementById('openai-api-key');
const openaiModelInput = document.getElementById('openai-model');
const openaiBaseUrlInput = document.getElementById('openai-base-url');
const openaiOrganizationInput = document.getElementById('openai-organization');
const targetLangSelect = document.getElementById('target-lang');
const translateModeSelect = document.getElementById('translate-mode');
const translateBtn = document.getElementById('translate-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const statusDiv = document.getElementById('status');

const ollamaSettingsDiv = document.getElementById('ollama-settings');
const openrouterSettingsDiv = document.getElementById('openrouter-settings');
const openaiSettingsDiv = document.getElementById('openai-settings');

// 默认设置
const defaultSettings = {
  provider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  modelName: 'qwen2:7b',
  openrouterApiKey: '',
  openrouterModel: 'anthropic/claude-3-haiku',
  openrouterSiteUrl: '',
  openrouterAppName: 'Ollama 翻译插件',
  openaiApiKey: '',
  openaiModel: 'gpt-3.5-turbo',
  openaiBaseUrl: 'https://api.openai.com/v1',
  openaiOrganization: '',
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
  openaiApiKeyInput.value = settings.openaiApiKey || '';
  openaiModelInput.value = settings.openaiModel || 'gpt-3.5-turbo';
  openaiBaseUrlInput.value = settings.openaiBaseUrl || 'https://api.openai.com/v1';
  openaiOrganizationInput.value = settings.openaiOrganization || '';
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
    openaiSettingsDiv.style.display = 'none';
  } else if (provider === 'openrouter') {
    ollamaSettingsDiv.style.display = 'none';
    openrouterSettingsDiv.style.display = 'block';
    openaiSettingsDiv.style.display = 'none';
  } else if (provider === 'openai') {
    ollamaSettingsDiv.style.display = 'none';
    openrouterSettingsDiv.style.display = 'none';
    openaiSettingsDiv.style.display = 'block';
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
    openaiApiKey: openaiApiKeyInput.value.trim(),
    openaiModel: openaiModelInput.value.trim(),
    openaiBaseUrl: openaiBaseUrlInput.value.trim(),
    openaiOrganization: openaiOrganizationInput.value.trim(),
    targetLang: targetLangSelect.value,
    translateMode: translateModeSelect.value
  };
  
  await chrome.storage.local.set({ translateSettings: settings });
  showStatus('设置已保存', 'success');
}

// 显示状态信息
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status show ${type}`;
  
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
  }, 3000);
}

// 通过background script调用翻译API
async function translateWithProvider(text, settings) {
  const response = await chrome.runtime.sendMessage({
    action: 'translateText',
    text: text,
    settings: settings
  });
  
  if (!response.success) {
    throw new Error(response.error || '翻译失败');
  }
  
  return response.translatedText;
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
    openaiApiKey: openaiApiKeyInput.value.trim(),
    openaiModel: openaiModelInput.value.trim(),
    openaiBaseUrl: openaiBaseUrlInput.value.trim(),
    openaiOrganization: openaiOrganizationInput.value.trim(),
    targetLang: targetLangSelect.value,
    translateMode: translateModeSelect.value
  };
  
  console.log('翻译设置:', settings);
  
  // 验证配置
  if (settings.provider === 'openrouter' && !settings.openrouterApiKey) {
    showStatus('请输入 OpenRouter API Key', 'error');
    return;
  }
  
  if (settings.provider === 'openai' && !settings.openaiApiKey) {
    showStatus('请输入 OpenAI API Key', 'error');
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
    
    // 如果是"Receiving end does not exist"错误，提示用户刷新页面
    if (error.message.includes('Receiving end does not exist')) {
      showStatus('错误: 请刷新当前页面后再试', 'error');
    } else {
      showStatus(`错误: ${error.message}`, 'error');
    }
  }
}

// 测试Ollama连接（通过background script避免CORS问题）
async function testOllamaConnection() {
  const ollamaUrl = ollamaUrlInput.value.trim();
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'testOllamaConnection',
      ollamaUrl: ollamaUrl
    });
    return response;
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
  // 立即关闭sidepanel
  closeSidePanel();
  // 然后执行翻译
  executeTranslate();
});

// 关闭sidepanel的函数
async function closeSidePanel() {
  try {
    // 获取当前窗口ID
    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTab && currentTab.windowId) {
      // 关闭当前窗口的sidepanel
      await chrome.sidePanel.close({ windowId: currentTab.windowId });
    }
  } catch (error) {
    console.error('关闭sidepanel失败:', error);
  }
}

// 初始化
console.log('sidepanel.js 加载完成，开始初始化...');
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
