// 翻译标记，用于防止重复翻译
const TRANSLATED_ATTR = 'data-ollama-translated';
const ORIGINAL_ATTR = 'data-ollama-original';

// 通过background script调用翻译API，避免CORS问题
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

// 翻译选中的文本
async function translateSelectedText(settings) {
  const selection = window.getSelection();
  const selectedText = selection.toString().trim();
  
  if (!selectedText) {
    return { success: false, error: '请先选择要翻译的文本' };
  }
  
  try {
    const translatedText = await translateWithProvider(selectedText, settings);
    
    // 创建翻译结果显示框
    showTranslationPopup(selectedText, translatedText);
    
    return { success: true, translatedText };
  } catch (error) {
    console.error('翻译错误:', error);
    return { success: false, error: error.message };
  }
}

// 显示翻译结果弹窗
function showTranslationPopup(originalText, translatedText) {
  // 移除已存在的弹窗
  const existingPopup = document.getElementById('ollama-translation-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // 创建弹窗容器
  const popup = document.createElement('div');
  popup.id = 'ollama-translation-popup';
  popup.innerHTML = `
    <div class="ollama-popup-header">
      <span class="ollama-popup-title">翻译结果</span>
      <button class="ollama-popup-close">×</button>
    </div>
    <div class="ollama-popup-content">
      <div class="ollama-original-text">
        <strong>原文：</strong>
        <p>${escapeHtml(originalText)}</p>
      </div>
      <div class="ollama-translated-text">
        <strong>译文：</strong>
        <p>${escapeHtml(translatedText)}</p>
      </div>
    </div>
    <div class="ollama-popup-footer">
      <button class="ollama-popup-copy">复制译文</button>
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    #ollama-translation-popup {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .ollama-popup-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    }
    
    .ollama-popup-title {
      font-size: 18px;
      font-weight: 600;
    }
    
    .ollama-popup-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }
    
    .ollama-popup-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .ollama-popup-content {
      padding: 20px;
    }
    
    .ollama-original-text,
    .ollama-translated-text {
      margin-bottom: 16px;
    }
    
    .ollama-original-text strong,
    .ollama-translated-text strong {
      display: block;
      margin-bottom: 8px;
      color: #333;
    }
    
    .ollama-original-text p,
    .ollama-translated-text p {
      margin: 0;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      line-height: 1.6;
      color: #555;
    }
    
    .ollama-translated-text p {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border: 1px solid #667eea30;
    }
    
    .ollama-popup-footer {
      padding: 12px 20px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: flex-end;
    }
    
    .ollama-popup-copy {
      padding: 8px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .ollama-popup-copy:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(popup);
  
  // 关闭按钮事件
  const closeBtn = popup.querySelector('.ollama-popup-close');
  closeBtn.addEventListener('click', () => {
    popup.remove();
    style.remove();
  });
  
  // 复制按钮事件
  const copyBtn = popup.querySelector('.ollama-popup-copy');
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
      copyBtn.textContent = '已复制！';
      setTimeout(() => {
        copyBtn.textContent = '复制译文';
      }, 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  });
  
  // 点击外部关闭
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target)) {
      popup.remove();
      style.remove();
      document.removeEventListener('click', closePopup);
    }
  });
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 翻译整个页面
async function translatePage(settings) {
  try {
    // 获取所有文本节点
    const textNodes = getTextNodes(document.body);
    
    if (textNodes.length === 0) {
      return { success: false, error: '页面没有可翻译的文本' };
    }
    
    let translatedCount = 0;
    let failedCount = 0;
    
    // 分批翻译文本节点
    for (const node of textNodes) {
      const text = node.textContent.trim();
      
      // 跳过已翻译的节点
      if (node.parentElement.hasAttribute(TRANSLATED_ATTR)) {
        continue;
      }
      
      // 跳过太短的文本
      if (text.length < 2) {
        continue;
      }
      
      try {
        const translatedText = await translateWithProvider(text, settings);
        
        // 保存原文并替换为译文
        const parent = node.parentElement;
        parent.setAttribute(ORIGINAL_ATTR, text);
        parent.setAttribute(TRANSLATED_ATTR, 'true');
        node.textContent = translatedText;
        
        translatedCount++;
      } catch (error) {
        console.error('翻译节点失败:', error);
        failedCount++;
      }
    }
    
    return {
      success: true,
      message: `翻译完成：成功 ${translatedCount} 处，失败 ${failedCount} 处`
    };
  } catch (error) {
    console.error('页面翻译错误:', error);
    return { success: false, error: error.message };
  }
}

// 获取所有文本节点
function getTextNodes(element) {
  const textNodes = [];
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // 跳过script、style等标签内的文本
        if (node.parentElement.tagName === 'SCRIPT' ||
            node.parentElement.tagName === 'STYLE' ||
            node.parentElement.tagName === 'NOSCRIPT') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 只保留包含非空白字符的文本节点
        if (node.textContent.trim().length > 0) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_REJECT;
      }
    }
  );
  
  let node;
  while (node = walker.nextNode()) {
    textNodes.push(node);
  }
  
  return textNodes;
}

// 恢复原文
function restoreOriginalText() {
  const elements = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
  
  elements.forEach(element => {
    const originalText = element.getAttribute(ORIGINAL_ATTR);
    if (originalText) {
      element.textContent = originalText;
      element.removeAttribute(TRANSLATED_ATTR);
      element.removeAttribute(ORIGINAL_ATTR);
    }
  });
  
  return { success: true, message: `已恢复 ${elements.length} 处翻译` };
}

// 悬停翻译功能
let hoverTimeout;
let hoverPopup = null;

function setupHoverTranslation(settings) {
  document.addEventListener('mouseover', (e) => {
    const target = e.target;
    const text = target.textContent?.trim();
    
    if (!text || text.length < 2) {
      return;
    }
    
    clearTimeout(hoverTimeout);
    
    hoverTimeout = setTimeout(async () => {
      try {
        const translatedText = await translateWithProvider(text, settings);
        showHoverTooltip(target, translatedText);
      } catch (error) {
        console.error('悬停翻译错误:', error);
      }
    }, 500);
  });
  
  document.addEventListener('mouseout', (e) => {
    clearTimeout(hoverTimeout);
    if (hoverPopup) {
      hoverPopup.remove();
      hoverPopup = null;
    }
  });
}

// 显示悬停提示
function showHoverTooltip(element, translatedText) {
  // 移除已存在的提示
  if (hoverPopup) {
    hoverPopup.remove();
  }
  
  const rect = element.getBoundingClientRect();
  
  hoverPopup = document.createElement('div');
  hoverPopup.className = 'ollama-hover-tooltip';
  hoverPopup.textContent = translatedText;
  
  const style = document.createElement('style');
  style.textContent = `
    .ollama-hover-tooltip {
      position: fixed;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      max-width: 300px;
      font-size: 14px;
      line-height: 1.5;
      pointer-events: none;
      animation: fadeIn 0.2s ease-in;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(hoverPopup);
  
  // 定位提示框
  const popupRect = hoverPopup.getBoundingClientRect();
  let top = rect.bottom + 10;
  let left = rect.left;
  
  // 防止超出视口
  if (top + popupRect.height > window.innerHeight) {
    top = rect.top - popupRect.height - 10;
  }
  
  if (left + popupRect.width > window.innerWidth) {
    left = window.innerWidth - popupRect.width - 10;
  }
  
  hoverPopup.style.top = top + 'px';
  hoverPopup.style.left = left + 'px';
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === 'translate') {
    const settings = request.settings;
    console.log('翻译设置:', settings);
    
    switch (settings.translateMode) {
      case 'selected':
        console.log('执行选中文字翻译');
        translateSelectedText(settings).then(sendResponse);
        return true; // 保持消息通道开放
      
      case 'page':
        console.log('执行页面翻译');
        translatePage(settings).then(sendResponse);
        return true;
      
      case 'hover':
        console.log('执行悬停翻译');
        setupHoverTranslation(settings);
        sendResponse({ success: true, message: '悬停翻译已启用' });
        return true;
      
      default:
        console.error('未知的翻译模式:', settings.translateMode);
        sendResponse({ success: false, error: '未知的翻译模式' });
    }
  } else if (request.action === 'restore') {
    console.log('执行恢复原文');
    restoreOriginalText().then(sendResponse);
    return true;
  }
  
  console.log('消息处理完成');
});

// 添加右键菜单（需要background.js支持）
chrome.runtime.sendMessage({ action: 'createContextMenu' });
