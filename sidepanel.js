// Side Panel 特定逻辑 - 复用 popup.js 的功能

// 聊天功能
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const clearBtn = document.getElementById('clear-btn');
const langBtn = document.getElementById('lang-btn');
const langDropdown = document.getElementById('lang-dropdown');
const chatMessages = document.getElementById('chat-messages');
const translateStatus = document.getElementById('translate-status');

// 当前选择的目标语言
let currentTargetLang = '中文';

// 添加聊天消息
 function addMessage(content, type = 'user') {
   const messageDiv = document.createElement('div');
   messageDiv.className = `chat-message ${type}`;
   
   // 获取当前时间
   const now = new Date();
   const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
   
   messageDiv.innerHTML = `
     <div class="message-content">${escapeHtml(content)}</div>
     <div class="message-time">${timeString}</div>
   `;
   chatMessages.appendChild(messageDiv);
   chatMessages.scrollTop = chatMessages.scrollHeight;
 }

// HTML转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 添加打字指示器
function addTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return typingDiv;
}

// 移除打字指示器
function removeTypingIndicator(typingElement) {
  if (typingElement && typingElement.parentNode) {
    typingElement.parentNode.removeChild(typingElement);
  }
}

// 发送翻译请求
async function sendTranslation() {
  const text = chatInput.value.trim();
  if (!text) {
    showStatus('请输入要翻译的文字', 'error');
    return;
  }

  // 添加用户消息
  addMessage(text, 'user');
  chatInput.value = '';

  // 获取当前设置
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
    translateMode: 'selected'
  };

  // 验证配置
  if (settings.provider === 'openrouter' && !settings.openrouterApiKey) {
    addMessage('错误: 请先在设置页面配置 OpenRouter API Key', 'system');
    return;
  }

  if (settings.provider === 'openai' && !settings.openaiApiKey) {
    addMessage('错误: 请先在设置页面配置 OpenAI API Key', 'system');
    return;
  }

  showStatus('正在翻译...', 'info');
  
  // 显示打字指示器
  const typingIndicator = addTypingIndicator();

  try {
    // 通过background script调用翻译API
    const response = await chrome.runtime.sendMessage({
      action: 'translateText',
      text: text,
      settings: settings
    });

    // 移除打字指示器
    removeTypingIndicator(typingIndicator);

    if (response.success) {
      addMessage(response.translatedText, 'system');
      showStatus('翻译完成', 'success');
    } else {
      throw new Error(response.error || '翻译失败');
    }
  } catch (error) {
    // 移除打字指示器
    removeTypingIndicator(typingIndicator);
    
    console.error('翻译错误:', error);
    addMessage(`翻译失败: ${error.message}`, 'system');
    showStatus(`错误: ${error.message}`, 'error');
  }
}

// 清空聊天记录
 function clearChat() {
   chatMessages.innerHTML = '';
   // 添加欢迎信息
   const welcomeDiv = document.createElement('div');
   welcomeDiv.className = 'welcome-message';
   welcomeDiv.innerHTML = `
     <div class="welcome-icon">✨</div>
     <h3>欢迎使用AI翻译助手</h3>
     <p>在这里输入您需要翻译的内容，我将为您提供高质量的翻译服务</p>
   `;
   chatMessages.appendChild(welcomeDiv);
   addMessage('请输入要翻译的文字，我将使用当前设置进行翻译。', 'system');
 }

// 自动调整文本框高度
 function adjustTextareaHeight() {
   chatInput.style.height = 'auto';
   chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
 }

 // 按钮悬停效果
 function addButtonHoverEffects() {
   const buttons = document.querySelectorAll('button');
   buttons.forEach(button => {
     button.classList.add('btn-hover-effect');
   });
 }

 // 添加输入框焦点效果
 function addInputFocusEffects() {
   chatInput.classList.add('input-focus-effect');
 }

 // 聊天事件监听
 sendBtn.addEventListener('click', sendTranslation);

 chatInput.addEventListener('input', adjustTextareaHeight);

 chatInput.addEventListener('keypress', (e) => {
   if (e.key === 'Enter' && !e.shiftKey) {
     e.preventDefault();
     sendTranslation();
   }
 });

 clearBtn.addEventListener('click', clearChat);

 // 初始化时调整文本框高度
 adjustTextareaHeight();
 
 // 添加交互效果
 addButtonHoverEffects();
 addInputFocusEffects();

// Tab切换功能
function initTabNavigation() {
  const tabItems = document.querySelectorAll('.tab-item');
  const pageContents = document.querySelectorAll('.page-content');

  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      // 移除所有tab的active状态
      tabItems.forEach(item => item.classList.remove('active'));
      // 激活当前点击的tab
      tab.classList.add('active');

      // 隐藏所有页面内容
      pageContents.forEach(page => page.classList.remove('active'));
      // 显示目标页面
      const targetPage = document.getElementById(`page-${targetTab}`);
      if (targetPage) {
        targetPage.classList.add('active');
      }
    });
  });
}

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
const saveSettingsBtn = document.getElementById('save-settings-btn');
const statusDiv = document.getElementById('status');

// 页面翻译页面的DOM元素
const targetLangSelectPt = document.getElementById('target-lang-pt');
const translateModeSelectPt = document.getElementById('translate-mode-pt');
const translateBtnPt = document.getElementById('translate-btn-pt');
const statusDivPt = document.getElementById('status-pt');

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
  
  // 设置页面翻译tab的值
  targetLangSelectPt.value = settings.targetLang;
  translateModeSelectPt.value = settings.translateMode;
  
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
    targetLang: targetLangSelectPt.value,  // 使用页面翻译tab的值
    translateMode: translateModeSelectPt.value  // 使用页面翻译tab的值
  };
  
  await chrome.storage.local.set({ translateSettings: settings });
  showStatus('设置已保存', 'success');
  
  // 同步更新页面翻译tab的值（以防万一）
  targetLangSelectPt.value = settings.targetLang;
  translateModeSelectPt.value = settings.translateMode;
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

// 显示页面翻译状态信息
function showStatusPt(message, type = 'info') {
  statusDivPt.textContent = message;
  statusDivPt.className = `status show ${type}`;
  
  setTimeout(() => {
    statusDivPt.textContent = '';
    statusDivPt.className = 'status';
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

// 执行翻译 - 从页面翻译tab获取设置
async function executeTranslate() {
  console.log('开始翻译...');
  
  // 从页面翻译tab获取设置
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
    targetLang: targetLangSelectPt.value,  // 使用页面翻译tab的目标语言
    translateMode: translateModeSelectPt.value  // 使用页面翻译tab的翻译模式
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

// 执行页面翻译
async function executePageTranslate() {
  console.log('开始页面翻译...');
  
  // 从页面翻译tab获取设置
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
    targetLang: targetLangSelectPt.value,  // 使用页面翻译tab的目标语言
    translateMode: translateModeSelectPt.value  // 使用页面翻译tab的翻译模式
  };
  
  console.log('页面翻译设置:', settings);
  
  // 验证配置
  if (settings.provider === 'openrouter' && !settings.openrouterApiKey) {
    showStatusPt('请输入 OpenRouter API Key', 'error');
    return;
  }
  
  if (settings.provider === 'openai' && !settings.openaiApiKey) {
    showStatusPt('请输入 OpenAI API Key', 'error');
    return;
  }
  
  showStatusPt('正在翻译...', 'info');
  
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
      showStatusPt('翻译完成', 'success');
    } else {
      throw new Error(response.error || '翻译失败');
    }
  } catch (error) {
    console.error('页面翻译错误:', error);
    
    // 如果是"Receiving end does not exist"错误，提示用户刷新页面
    if (error.message.includes('Receiving end does not exist')) {
      showStatusPt('错误: 请刷新当前页面后再试', 'error');
    } else {
      showStatusPt(`错误: ${error.message}`, 'error');
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

// 语言选择按钮点击事件
langBtn.addEventListener('click', () => {
  langDropdown.classList.toggle('show');
});

// 语言选项点击事件
const langDropdownItems = document.querySelectorAll('.lang-dropdown-item');
langDropdownItems.forEach(item => {
  item.addEventListener('click', () => {
    const lang = item.getAttribute('data-lang');
    currentTargetLang = lang;
    
    // 更新选中状态
    langDropdownItems.forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    
    // 更新设置中的目标语言
    targetLangSelectPt.value = lang;
    saveCurrentSettings();
    
    console.log('选择语言:', lang);
  });
});

// 点击页面其他地方时关闭下拉框
document.addEventListener('click', (e) => {
  if (!langDropdown.contains(e.target) && !langBtn.contains(e.target)) {
    langDropdown.classList.remove('show');
  }
});

// 当页面翻译tab的目标语言或翻译模式改变时，立即保存设置
targetLangSelectPt.addEventListener('change', () => {
  // 保存当前设置到存储
  saveCurrentSettings();
});

translateModeSelectPt.addEventListener('change', () => {
  // 保存当前设置到存储
  saveCurrentSettings();
});

// 保存当前设置的辅助函数
async function saveCurrentSettings() {
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
    targetLang: targetLangSelectPt.value,  // 使用页面翻译tab的目标语言
    translateMode: translateModeSelectPt.value  // 使用页面翻译tab的翻译模式
  };
  
  await chrome.storage.local.set({ translateSettings: settings });
}



// 页面翻译按钮事件监听
translateBtnPt.addEventListener('click', () => {
  console.log('页面翻译按钮被点击');
  // 立即关闭sidepanel
  closeSidePanel();
  // 然后执行页面翻译
  executePageTranslate();
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

// 帮助中心搜索功能
function initHelpSearch() {
  const searchInput = document.getElementById('help-search-input');
  const helpCards = document.querySelectorAll('.help-card');
  const helpTags = document.querySelectorAll('.help-tag');
  
  if (!searchInput) return;
  
  // 搜索功能
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    helpCards.forEach(card => {
      const title = card.querySelector('.help-card-title').textContent.toLowerCase();
      const content = card.querySelector('.help-card-content').textContent.toLowerCase();
      const tags = Array.from(card.querySelectorAll('.help-tag')).map(tag => tag.textContent.toLowerCase());
      
      const matchesTitle = title.includes(searchTerm);
      const matchesContent = content.includes(searchTerm);
      const matchesTags = tags.some(tag => tag.includes(searchTerm));
      
      if (searchTerm === '' || matchesTitle || matchesContent || matchesTags) {
        card.style.display = 'block';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      } else {
        card.style.display = 'none';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
      }
    });
  });
  
  // 标签点击功能
  helpTags.forEach(tag => {
    tag.addEventListener('click', () => {
      const tagText = tag.textContent;
      searchInput.value = tagText;
      
      // 触发搜索事件
      searchInput.dispatchEvent(new Event('input'));
      
      // 滚动到第一个匹配的卡片
      setTimeout(() => {
        const firstVisibleCard = Array.from(helpCards).find(card => card.style.display !== 'none');
        if (firstVisibleCard) {
          firstVisibleCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });
  });
}

// 初始化
console.log('sidepanel.js 加载完成，开始初始化...');
initTabNavigation();
loadSettings();
initHelpSearch();

// 动态计算页面高度
function calculatePageHeights() {
    // 获取浏览器窗口高度
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // 计算各页面的实际可用高度（减去顶部和底部UI元素的高度）
    const headerHeight = 60; // 顶部导航高度
    const inputAreaHeight = 120; // 输入区域高度（对于非聊天页面可能不需要）
    const statusBarHeight = 40; // 状态栏高度
    const padding = 20; // 总内边距
    
    const availableHeight = windowHeight - headerHeight - statusBarHeight - padding;
    
    // 应用动态高度到各个页面内容区
    const pageContents = document.querySelectorAll('.page-content');
    pageContents.forEach(page => {
      page.style.height = `${availableHeight}px`;
    });
    
    // 特别处理聊天消息区域（仅聊天页面需要）
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.style.maxHeight = `${availableHeight - 80}px`; // 额外减去其他元素占用的空间
    }
    
    // 处理帮助页面滚动容器
    const helpScrollContainer = document.querySelector('.help-scroll-container');
    if (helpScrollContainer) {
      helpScrollContainer.style.height = `${availableHeight - 60}px`;
    }
  }

// 页面加载完成后计算一次高度
window.addEventListener('load', calculatePageHeights);

// 监听窗口大小变化，动态调整高度
window.addEventListener('resize', calculatePageHeights);

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
