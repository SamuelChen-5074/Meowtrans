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

// 批量翻译文本
async function translateBatch(texts, settings) {
  if (texts.length === 0) return [];
  
  // 将多个文本合并成一个请求
  const prompt = `请将以下文本逐行翻译成${settings.targetLang}，每行对应一个翻译结果，只返回翻译结果，不要添加任何解释：\n\n` +
    texts.map((text, index) => `${index + 1}. ${text}`).join('\n');
  
  const response = await chrome.runtime.sendMessage({
    action: 'translateText',
    text: prompt,
    settings: settings
  });
  
  if (!response.success) {
    throw new Error(response.error || '批量翻译失败');
  }
  
  // 解析批量翻译结果
  const translatedLines = response.translatedText
    .split('\n')
    .map(line => line.replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
  
  return translatedLines;
}

// 翻译整个页面（优化版：批量+并发）
async function translatePage(settings) {
  try {
    // 先恢复原文，确保每次翻译都是基于原文进行
    restoreOriginalText();

    // 获取所有文本节点
    const textNodes = getTextNodes(document.body);
    
    if (textNodes.length === 0) {
      return { success: false, error: '页面没有可翻译的文本' };
    }
    
    // 过滤并准备待翻译的节点
    const nodesToTranslate = [];
    for (const node of textNodes) {
      const text = node.textContent.trim();
      
      // 跳过太短的文本
      if (text.length < 2) {
        continue;
      }
      
      nodesToTranslate.push({ node, text });
    }
    
    if (nodesToTranslate.length === 0) {
      return { success: false, error: '没有需要翻译的文本' };
    }
    
    let translatedCount = 0;
    let failedCount = 0;
    const batchSize = 5; // 每批翻译5个文本
    const concurrency = 10; // 并发处理10个批次
    
    // 分批处理
    const batches = [];
    for (let i = 0; i < nodesToTranslate.length; i += batchSize) {
      batches.push(nodesToTranslate.slice(i, i + batchSize));
    }
    
    // 并发处理批次
    for (let i = 0; i < batches.length; i += concurrency) {
      const concurrentBatches = batches.slice(i, i + concurrency);
      
      const results = await Promise.allSettled(
        concurrentBatches.map(batch => {
          const texts = batch.map(item => item.text);
          return translateBatch(texts, settings);
        })
      );
      
      // 处理每个批次的结果
      for (let j = 0; j < concurrentBatches.length; j++) {
        const batch = concurrentBatches[j];
        const result = results[j];
        
        if (result.status === 'fulfilled') {
          const translatedTexts = result.value;
          
          for (let k = 0; k < batch.length; k++) {
            const { node, text } = batch[k];
            const translatedText = translatedTexts[k] || text;
            
            try {
              // 检查节点是否仍然存在且有效
              if (!node || !node.parentNode || !node.parentElement) {
                console.warn('节点已被移除或无效，跳过翻译');
                failedCount++;
                continue;
              }
              
              // 再次验证父元素是否仍然存在于DOM中
              if (!document.contains(node.parentElement)) {
                console.warn('父元素不在DOM中，跳过翻译');
                failedCount++;
                continue;
              }
              
              // 检查节点内容是否已经改变（可能被其他脚本修改）
              if (node.textContent.trim() !== text) {
                console.warn('节点内容已改变，跳过翻译');
                failedCount++;
                continue;
              }
              
              // 保存原文并替换为译文（移除了重复翻译检查，让每个节点都能被处理）
              const parent = node.parentElement;
              parent.setAttribute(ORIGINAL_ATTR, text);
              parent.setAttribute(TRANSLATED_ATTR, 'true');
              node.textContent = translatedText;
              
              translatedCount++;
            } catch (error) {
              console.error('应用翻译失败:', error);
              failedCount++;
            }
          }
        } else {
          console.error('批次翻译失败:', result.reason);
          failedCount += batch.length;
        }
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
        // 检查节点是否存在有效的父元素
        if (!node.parentElement) {
          return NodeFilter.FILTER_REJECT;
        }
        
        const parentTag = node.parentElement.tagName || '';
        const parentClass = typeof node.parentElement.className === 'string' ? node.parentElement.className : '';
        const parentId = typeof node.parentElement.id === 'string' ? node.parentElement.id : '';
        const parentAttributes = Array.from(node.parentElement.attributes).map(attr => attr.name);
        const text = node.textContent.trim();
        
        // 跳过script、style、code等标签内的文本
        if (parentTag === 'SCRIPT' ||
            parentTag === 'STYLE' ||
            parentTag === 'NOSCRIPT' ||
            parentTag === 'CODE' ||
            parentTag === 'PRE' ||
            parentTag === 'KBD' ||
            parentTag === 'SAMP' ||
            parentTag === 'VAR' ||
            parentTag === 'TT' ||
            parentTag === 'BLOCKQUOTE') {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 检查祖先元素是否是代码相关标签（处理嵌套情况）
        let ancestor = node.parentElement;
        while (ancestor) {
          const ancestorTag = ancestor.tagName || '';
          if (ancestorTag === 'PRE' || ancestorTag === 'CODE') {
            return NodeFilter.FILTER_REJECT;
          }
          ancestor = ancestor.parentElement;
        }
        
        // 跳过具有代码相关tag的元素（包括自定义代码编辑器标签）
        const codeRelatedTags = ['CFC-CODE-SNIPPET', 'CFC-CODE-EDITOR', 'MONACO-EDITOR', 'CODEMIRROR', 'ACE_EDITOR', 'PRISM-TOKEN'];
        if (codeRelatedTags.includes(parentTag.toUpperCase())) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 跳过具有代码相关class的元素
        const codeRelatedClasses = ['code', 'Code', 'code-block', 'code-block', 'highlight', 'highlighted', 'language-', 'lang-', 'hljs', 'brush:', 'prettyprint', 'syntax', 'monaco', 'ace_', 'cm-', 'prism-', 'token', 'mtk', 'view-line', 'cfc-code', 'mat-', 'mdc-', 'monaco-editor', 'cfc-code-editor'];
        if (codeRelatedClasses.some(cls => 
          parentClass.toLowerCase().includes(cls.toLowerCase()) || parentId.toLowerCase().includes(cls.toLowerCase())
        )) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 跳过具有代码相关属性的元素
        if (parentAttributes.some(attr => 
          ['data-language', 'data-lang', 'data-code', 'data-highlight', 'data-mprt', 'role="code"', 'data-uri'].includes(attr.toLowerCase())
        ) || node.parentElement.hasAttribute('data-language') ||
            node.parentElement.hasAttribute('data-lang') ||
            node.parentElement.hasAttribute('data-code') ||
            node.parentElement.hasAttribute('data-highlight') ||
            (node.parentElement.getAttribute('role') === 'code') ||
            (node.parentElement.getAttribute('data-uri') && node.parentElement.getAttribute('data-uri').includes('inmemory'))) {
          return NodeFilter.FILTER_REJECT;
        }
        
        // 跳过可能包含代码的元素（如果文本中包含大量特殊字符）
        // 但是要更谨慎，避免误判普通文本
        if (text.length > 20) { // 增加最小长度要求
          const specialCharRatio = (text.match(/[^a-zA-Z\u4e00-\u9fff\s\d.,!?;:'"()-]/g) || []).length / text.length;
          // 只有当特殊字符（排除常用标点符号）比例超过40%时才认为是代码
          if (specialCharRatio > 0.4) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        
        // 只保留包含非空白字符的文本节点
        if (text.length > 1) { // 至少2个字符才考虑翻译
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

// 页面加载完成后初始化翻译功能
function initializeTranslation() {
  console.log('翻译功能初始化完成');
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
        // 对于页面翻译，等待DOM完全加载和稳定后再执行
        if (document.readyState === 'loading' || document.readyState === 'interactive') {
          // 如果DOM还在加载中，等待complete状态
          document.addEventListener('DOMContentLoaded', () => {
            // 添加短暂延迟确保所有内容都已渲染
            setTimeout(() => {
              translatePage(settings).then(sendResponse);
            }, 1000);
          });
        } else {
          // DOM已经加载完成，但仍添加短暂延迟确保动态内容加载
          setTimeout(() => {
            translatePage(settings).then(sendResponse);
          }, 1000);
        }
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
  } else if (request.action === 'cancelAndRestore') {
    console.log('执行取消翻译并恢复原文');
    // 首先清除任何正在进行的翻译操作，然后恢复原文
    restoreOriginalText().then(sendResponse);
    return true;
  } else if (request.action === 'check_translated_status') {
    // 检查页面是否已经被翻译
    const translatedElements = document.querySelectorAll(`[${TRANSLATED_ATTR}]`);
    sendResponse({ 
      success: true, 
      isTranslated: translatedElements.length > 0,
      translatedCount: translatedElements.length 
    });
    return true;
  }
  
  console.log('消息处理完成');
});

// 确保页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTranslation);
} else {
  initializeTranslation();
}

// 添加右键菜单（需要background.js支持）
chrome.runtime.sendMessage({ action: 'createContextMenu' });