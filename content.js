// 翻译标记，用于防止重复翻译
const TRANSLATED_ATTR = 'data-ollama-translated';
const ORIGINAL_ATTR = 'data-ollama-original';

// 用于控制翻译过程的全局变量
let isTranslating = false;
let translationAbortController = null; // 用于控制翻译中断
let currentTranslationId = 0; // 用于标识当前翻译过程的唯一ID
let lastTranslationTime = 0; // 上次翻译的时间戳
const TRANSLATION_DEBOUNCE_MS = 500; // 防抖延迟时间（毫秒）

// 页面唯一ID，用于区分不同页面加载实例
const PAGE_INSTANCE_ID = Date.now() + Math.random();

// 页面加载时间戳，用于识别页面是否刚刚加载
const PAGE_LOAD_TIMESTAMP = Date.now();

// DOM观察器，用于处理动态加载的内容
let domObserver = null;

// 是否启用动态翻译（根据设置决定）
let enableDynamicTranslation = false;

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
  // 为当前翻译过程生成唯一ID
  const thisTranslationId = ++currentTranslationId;
  console.log(`开始翻译过程 #${thisTranslationId}`);
  
  try {
    // 如果已经有翻译在进行，中断之前的翻译过程
    if (translationAbortController) {
      console.log('检测到已有翻译进程在运行，中断之前的翻译');
      translationAbortController.abort(); // 使用AbortController中断之前的翻译
      // 注意：这里不立即将translationAbortController设置为null，
      // 因为其他地方可能还在检查它的signal状态
    }
    
    // 等待很短时间，确保之前的中断信号被充分处理
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 创建新的AbortController用于当前翻译
    translationAbortController = new AbortController();
    
    // 设置正在翻译标志
    isTranslating = true;
    
    // 先恢复原文，确保每次翻译都是基于原文进行
    restoreOriginalText();

    // 获取所有文本节点
    const textNodes = getTextNodes(document.body);
    
    if (textNodes.length === 0) {
      isTranslating = false;
      translationAbortController = null;
      return { success: false, error: '页面没有可翻译的文本' };
    }
    
    // 过滤并准备待翻译的节点
    const nodesToTranslate = [];
    for (const node of textNodes) {
      const text = node.textContent.trim();
      
      // 检查是否被外部信号中断或是否是当前翻译ID
      if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
        console.log(`翻译#${thisTranslationId}被中断，停止处理剩余节点`);
        isTranslating = false;
        translationAbortController = null;
        return { success: false, error: '翻译被中断' };
      }
      
      // 跳过已翻译的节点
      if (node.parentElement.hasAttribute(TRANSLATED_ATTR)) {
        continue;
      }
      
      // 跳过太短的文本
      if (text.length < 2) {
        continue;
      }
      
      nodesToTranslate.push({ node, text });
    }
    
    if (nodesToTranslate.length === 0) {
      isTranslating = false;
      translationAbortController = null;
      return { success: false, error: '没有需要翻译的文本' };
    }
    
    let translatedCount = 0;
    let failedCount = 0;
    const batchSize = 5; // 每批翻译5个文本
    const concurrency = 10; // 并发处理10个批次
    
    // 分批处理
    const batches = [];
    for (let i = 0; i < nodesToTranslate.length; i += batchSize) {
      // 检查是否被外部信号中断或是否是当前翻译ID
      if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
        console.log(`翻译#${thisTranslationId}被中断，停止分批处理`);
        isTranslating = false;
        translationAbortController = null;
        return { success: false, error: '翻译被中断' };
      }
      batches.push(nodesToTranslate.slice(i, i + batchSize));
    }
    
    // 并发处理批次
    for (let i = 0; i < batches.length; i += concurrency) {
      // 检查是否被外部信号中断或是否是当前翻译ID
      if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
        console.log(`翻译#${thisTranslationId}被中断，停止并发处理`);
        isTranslating = false;
        translationAbortController = null;
        return { success: false, error: '翻译被中断' };
      }
      
      const concurrentBatches = batches.slice(i, i + concurrency);
      
      const results = await Promise.allSettled(
        concurrentBatches.map(batch => {
          // 检查是否被外部信号中断或是否是当前翻译ID
          if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
            console.log(`翻译#${thisTranslationId}被中断，停止批次翻译`);
            return Promise.reject(new Error('翻译被中断'));
          }
          
          const texts = batch.map(item => item.text);
          return translateBatch(texts, settings);
        })
      );
      
      // 检查是否被外部信号中断或是否是当前翻译ID
      if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
        console.log(`翻译#${thisTranslationId}被中断，停止处理结果`);
        isTranslating = false;
        translationAbortController = null;
        return { success: false, error: '翻译被中断' };
      }
      
      // 处理每个批次的结果
      for (let j = 0; j < concurrentBatches.length; j++) {
        const batch = concurrentBatches[j];
        const result = results[j];
        
        // 检查是否被外部信号中断或是否是当前翻译ID
        if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
          console.log(`翻译#${thisTranslationId}被中断，停止处理单个批次`);
          isTranslating = false;
          translationAbortController = null;
          return { success: false, error: '翻译被中断' };
        }
        
        if (result.status === 'fulfilled') {
          const translatedTexts = result.value;
          
          for (let k = 0; k < batch.length; k++) {
            // 检查是否被外部信号中断或是否是当前翻译ID
            if ((translationAbortController && translationAbortController.signal.aborted) || currentTranslationId !== thisTranslationId) {
              console.log(`翻译#${thisTranslationId}被中断，停止应用翻译`);
              isTranslating = false;
              translationAbortController = null;
              return { success: false, error: '翻译被中断' };
            }
            
            const { node, text } = batch[k];
            const translatedText = translatedTexts[k] || text;
            
            try {
              // 检查节点是否仍然存在且有效
              if (!node || !node.parentElement) {
                console.warn('节点已被移除，跳过翻译');
                failedCount++;
                continue;
              }
              
              // 保存原文并替换为译文
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
    
    // 只有当这是最新的翻译ID时才完成翻译
    if (currentTranslationId === thisTranslationId) {
      // 翻译完成后重置标志
      isTranslating = false;
      translationAbortController = null;
      
      // 根据设置决定是否启用动态翻译监控
      enableDynamicTranslation = true; // 启用动态翻译
      if (settings.translateMode === 'page') {
        startDomObserver(); // 启动DOM观察器以处理动态加载的内容
      }
      
      console.log(`翻译#${thisTranslationId}完成`);
      return {
        success: true,
        message: `翻译完成：成功 ${translatedCount} 处，失败 ${failedCount} 处`
      };
    } else {
      console.log(`翻译#${thisTranslationId}被新翻译覆盖，提前终止`);
      return { success: false, error: '翻译被新请求覆盖' };
    }
  } catch (error) {
    console.error('页面翻译错误:', error);
    // 确保在任何情况下都重置翻译标志
    isTranslating = false;
    translationAbortController = null;
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
        // 添加防抖逻辑，避免短时间内重复翻译
        const now = Date.now();
        if (now - lastTranslationTime < TRANSLATION_DEBOUNCE_MS) {
          console.log(`翻译请求过于频繁，已忽略（间隔: ${now - lastTranslationTime}ms < ${TRANSLATION_DEBOUNCE_MS}ms）`);
          sendResponse({ success: false, error: '翻译请求过于频繁，请稍后再试' });
          return true;
        }
        
        // 检查是否已经有翻译在进行
        if (isTranslating) {
          console.log('已有翻译进程在运行，忽略新的翻译请求');
          sendResponse({ success: false, error: '已有翻译进程在运行，请等待完成' });
          return true;
        }
        
        lastTranslationTime = now;
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
  } else if (request.action === 'cancelAndRestore') {
    console.log('执行取消翻译并恢复原文');
    
    // 检查页面是否刚刚加载（1秒内），如果是则忽略中断消息
    // 这可以防止页面跳转后立即收到旧页面的中断消息
    const timeSinceLoad = Date.now() - PAGE_LOAD_TIMESTAMP;
    const IGNORE_PERIOD = 1000; // 1秒的保护期
    
    if (timeSinceLoad < IGNORE_PERIOD) {
      console.log(`页面刚刚加载 (${timeSinceLoad}ms)，忽略中断消息以防止页面跳转干扰`);
      sendResponse({ success: true, message: '页面刚加载，忽略中断消息' });
      return true;
    }
    
    // 只有在当前页面实例ID匹配或没有指定页面ID时才执行中断（兼容旧版本）
    if (!request.pageInstanceId || request.pageInstanceId === PAGE_INSTANCE_ID) {
      if (translationAbortController) {
        translationAbortController.abort(); // 使用AbortController中断任何正在进行的翻译
      }
      isTranslating = false; // 同时设置标志为false
      const result = restoreOriginalText(); // 然后恢复原文
      sendResponse(result);
    } else {
      // 请求是针对其他页面实例的，忽略
      sendResponse({ success: true, message: '消息已忽略，不是针对当前页面实例' });
    }
    return true;
  }
  
  console.log('消息处理完成');
});

// 启动DOM观察器以处理动态加载的内容
function startDomObserver() {
  // 如果已有观察器在运行，先停止它
  if (domObserver) {
    domObserver.disconnect();
  }

  // 配置观察选项
  const config = {
    childList: true,      // 观察子节点的变化
    subtree: true,        // 观察所有后代节点
    attributes: false,    // 不观察属性变化
    characterData: true   // 观察文本节点的变化
  };

  // 创建观察器实例
  domObserver = new MutationObserver(function(mutations) {
    let shouldTranslateNewContent = false;
    
    // 检查所有变更
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        // 检查新增的节点
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            // 检查文本节点内容是否需要翻译
            if (node.textContent && node.textContent.trim().length > 1) {
              // 检查父元素是否已经被翻译过
              if (!node.parentElement.hasAttribute(TRANSLATED_ATTR) && 
                  node.parentElement.tagName !== 'SCRIPT' &&
                  node.parentElement.tagName !== 'STYLE' &&
                  node.parentElement.tagName !== 'NOSCRIPT') {
                shouldTranslateNewContent = true;
                break;
              }
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 检查新元素内的文本节点
            const textNodes = getTextNodes(node);
            if (textNodes.length > 0) {
              shouldTranslateNewContent = true;
              break;
            }
          }
        }
      } else if (mutation.type === 'characterData') {
        // 文本节点内容发生变化
        if (mutation.target.textContent && mutation.target.textContent.trim().length > 1) {
          if (!mutation.target.parentElement.hasAttribute(TRANSLATED_ATTR)) {
            shouldTranslateNewContent = true;
          }
        }
      }
      
      if (shouldTranslateNewContent) break;
    }

    if (shouldTranslateNewContent) {
      // 防抖处理，避免频繁触发
      if (window.translationDebounceTimer) {
        clearTimeout(window.translationDebounceTimer);
      }

      window.translationDebounceTimer = setTimeout(async () => {
        // 检查是否已经有翻译在进行
        if (isTranslating) {
          console.log('已有翻译进程在运行，跳过动态内容翻译');
          return;
        }

        console.log('检测到新的文本内容，开始翻译');
        await translateNewContent();
      }, 500); // 0.5秒防抖延迟
    }
  });

  // 开始观察
  domObserver.observe(document.body, config);
  console.log('DOM观察器已启动，开始监控动态内容');
}

// 翻译新出现的内容
async function translateNewContent() {
  console.log('开始翻译新出现的内容');

  // 获取尚未翻译的文本节点
  const textNodes = getTextNodes(document.body);
  const nodesToTranslate = [];

  for (const node of textNodes) {
    const text = node.textContent.trim();

    // 检查是否需要翻译
    if (text.length >= 2 && 
        !node.parentElement.hasAttribute(TRANSLATED_ATTR) &&
        node.parentElement.tagName !== 'SCRIPT' &&
        node.parentElement.tagName !== 'STYLE' &&
        node.parentElement.tagName !== 'NOSCRIPT') {
      nodesToTranslate.push({ node, text });
    }
  }

  if (nodesToTranslate.length === 0) {
    console.log('没有发现新的可翻译内容');
    return;
  }

  console.log(`发现 ${nodesToTranslate.length} 个新的文本节点需要翻译`);

  // 获取当前的翻译设置
  try {
    const result = await chrome.storage.local.get('translateSettings');
    const settings = result.translateSettings || {
      provider: 'ollama',
      ollamaUrl: 'http://localhost:11434',
      modelName: 'qwen2:7b',
      targetLang: '中文'
    };

    // 翻译新内容
    for (const { node, text } of nodesToTranslate) {
      try {
        // 翻译文本
        const translatedText = await translateWithProvider(text, settings);

        // 保存原文并替换为译文
        const parent = node.parentElement;
        parent.setAttribute(ORIGINAL_ATTR, text);
        parent.setAttribute(TRANSLATED_ATTR, 'true');
        node.textContent = translatedText;

        console.log(`翻译新内容: "${text.substring(0, 20)}..." -> "${translatedText.substring(0, 20)}..."`);
      } catch (error) {
        console.error('翻译单个节点失败:', error);
      }
    }
  } catch (storageError) {
    console.error('获取翻译设置失败:', storageError);
  }
}

// 添加右键菜单（需要background.js支持）
chrome.runtime.sendMessage({ action: 'createContextMenu' });
