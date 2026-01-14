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
    let errorMessage = `Ollama API 错误: ${response.status}`;
    if (response.status === 404) {
      errorMessage += ` - 模型 "${settings.modelName}" 不存在或 Ollama 服务未运行。请检查 Ollama 服务是否在 ${settings.ollamaUrl} 上运行，并确保模型已下载。`;
    } else if (response.status === 500) {
      errorMessage += ` - Ollama 服务内部错误。请检查 Ollama 服务状态。`;
    }
    throw new Error(errorMessage);
  }
  
  const data = await response.json();
  return data.response.trim();
}

// 调用OpenRouter API进行翻译
async function translateWithOpenRouter(text, settings) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;
  
  // 对包含非 ASCII 字符的 header 值进行编码
  const appName = settings.openrouterAppName || 'Ollama Translation Extension';
  const encodedAppName = encodeURIComponent(appName);
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${settings.openrouterApiKey}`,
    'HTTP-Referer': settings.openrouterSiteUrl || 'https://localhost',
    'X-Title': encodedAppName
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

// 监听来自content script和popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'createContextMenu') {
    createContextMenu();
    sendResponse({ success: true });
  } else if (request.action === 'translateText') {
    // 在background script中处理翻译请求，避免CORS问题
    handleTranslateText(request.text, request.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  } else if (request.action === 'testOllamaConnection') {
    // 测试Ollama连接
    handleTestOllamaConnection(request.ollamaUrl)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// 处理翻译文本请求
async function handleTranslateText(text, settings) {
  try {
    if (settings.provider === 'openrouter') {
      const translatedText = await translateWithOpenRouter(text, settings);
      return { success: true, translatedText };
    } else {
      const translatedText = await translateWithOllama(text, settings);
      return { success: true, translatedText };
    }
  } catch (error) {
    console.error('翻译错误:', error);
    return { success: false, error: error.message };
  }
}

// 测试Ollama连接
async function handleTestOllamaConnection(ollamaUrl) {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`);
    if (!response.ok) {
      throw new Error('连接失败');
    }
    const data = await response.json();
    return { success: true, models: data.models };
  } catch (error) {
    console.error('Ollama连接测试失败:', error);
    return { success: false, error: error.message };
  }
}

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
