// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();
});

// 创建右键菜单项
function createContextMenu() {
  // 移除已存在的菜单
  chrome.contextMenus.removeAll(() => {
    // 创建翻译选中文字的菜单项
    chrome.contextMenus.create({
      id: 'translate-selection',
      title: '翻译选中文字',
      contexts: ['selection']
    });
    
    // 创建翻译整个页面的菜单项
    chrome.contextMenus.create({
      id: 'translate-page',
      title: '翻译整个页面',
      contexts: ['page']
    });
    
    // 创建恢复原文的菜单项
    chrome.contextMenus.create({
      id: 'restore-original',
      title: '恢复原文',
      contexts: ['page']
    });
  });
}

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'translate-selection') {
    translateSelection(tab);
  } else if (info.menuItemId === 'translate-page') {
    translatePage(tab);
  } else if (info.menuItemId === 'restore-original') {
    restoreOriginal(tab);
  }
});

// 翻译选中文字
async function translateSelection(tab) {
  try {
    // 获取保存的设置
    const result = await chrome.storage.local.get('translateSettings');
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
    const settings = result.translateSettings || defaultSettings;
    
    // 向content script发送消息
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'translate',
      settings: { ...settings, translateMode: 'selected' }
    });
    
    if (!response.success) {
      console.error('翻译失败:', response.error);
    }
  } catch (error) {
    console.error('翻译选中文字错误:', error);
  }
}

// 翻译整个页面
async function translatePage(tab) {
  try {
    // 获取保存的设置
    const result = await chrome.storage.local.get('translateSettings');
    const defaultSettings = {
      provider: 'ollama',
      ollamaUrl: 'http://localhost:11434',
      modelName: 'qwen2:7b',
      openrouterApiKey: '',
      openrouterModel: 'anthropic/claude-3-haiku',
      openrouterSiteUrl: '',
      openrouterAppName: 'Ollama 翻译插件',
      targetLang: '中文',
      translateMode: 'page'
    };
    const settings = result.translateSettings || defaultSettings;
    
    // 向content script发送消息
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'translate',
      settings: { ...settings, translateMode: 'page' }
    });
    
    if (!response.success) {
      console.error('翻译失败:', response.error);
    }
  } catch (error) {
    console.error('翻译页面错误:', error);
  }
}

// 恢复原文
async function restoreOriginal(tab) {
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'restore'
    });
    
    if (!response.success) {
      console.error('恢复原文失败:', response.error);
    }
  } catch (error) {
    console.error('恢复原文错误:', error);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command === 'translate') {
    await translateSelection(tab);
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createContextMenu') {
    createContextMenu();
    sendResponse({ success: true });
  }
});

// 插件图标点击事件（可选）
chrome.action.onClicked.addListener((tab) => {
  // 如果需要点击图标直接执行某些操作，可以在这里添加
  // 当前配置使用popup，所以这个事件不会被触发
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面完全加载后，可以执行一些初始化操作
  if (changeInfo.status === 'complete' && tab.url) {
    // 可以在这里注入一些初始化脚本
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.translateSettings) {
    // 当设置改变时，可以执行一些操作
    console.log('翻译设置已更新:', changes.translateSettings.newValue);
  }
});

// 保持Service Worker活跃（可选）
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // 执行一些轻量级操作以保持Service Worker活跃
    console.log('Service Worker keep-alive ping');
  }
});
