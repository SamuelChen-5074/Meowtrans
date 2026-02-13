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
      openrouterAppName: '翻译插件',
      openaiApiKey: '',
      openaiModel: 'gpt-3.5-turbo',
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiOrganization: '',
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
      openaiApiKey: '',
      openaiModel: 'gpt-3.5-turbo',
      openaiBaseUrl: 'https://api.openai.com/v1',
      openaiOrganization: '',
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
    'Authorization': `Bearer ${sanitizeHeaderValue(settings.openrouterApiKey)}`,
    'HTTP-Referer': sanitizeHeaderValue(settings.openrouterSiteUrl || 'https://localhost'),
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

// 调用OpenAI API进行翻译
async function translateWithOpenAI(text, settings) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;

  // 获取API基础URL，默认为OpenAI官方API
  const baseUrl = settings.openaiBaseUrl || 'https://api.openai.com/v1';
  const apiUrl = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sanitizeHeaderValue(settings.openaiApiKey)}`
  };

  const requestBody = {
    model: settings.openaiModel || 'gpt-3.5-turbo',
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ]
  };

  // 如果设置了organization ID，添加到请求头
  if (settings.openaiOrganization) {
    headers['OpenAI-Organization'] = sanitizeHeaderValue(settings.openaiOrganization);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenAI API 错误: ${response.status}`;

    try {
      const errorData = JSON.parse(errorText);
      errorMessage += ` - ${errorData.error?.message || errorData.message || '未知错误'}`;
    } catch (e) {
      errorMessage += ` - ${errorText}`;
    }

    throw new Error(errorMessage);
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
  } else if (request.action === 'ocrAndTranslate') {
    // 处理OCR和翻译请求
    handleOcrAndTranslate(request.imageDataUrl, request.settings)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
});

// 处理OCR和翻译请求
async function handleOcrAndTranslate(imageDataUrl, settings) {
  try {
    // console.log('开始OCR和翻译处理:', {
    //   imageDataLength: imageDataUrl.length,
    //   ocrProvider: settings.ocrProvider,
    //   ollamaOcrUrl: settings.ollamaOcrUrl,
    //   ollamaOcrModel: settings.ollamaOcrModel,
    //   timestamp: new Date().toISOString()
    // });
    
    // 从图片中提取文本
    const extractedText = await extractTextFromImage(imageDataUrl, settings);
    
    // console.log('OCR提取结果:', {
    //   extractedTextLength: extractedText ? extractedText.length : 0,
    //   hasText: !!(extractedText && extractedText.trim().length > 0),
    //   timestamp: new Date().toISOString()
    // });
    
    if (!extractedText || extractedText.trim().length === 0) {
      return { success: false, error: '未能从图片中识别到任何文字' };
    }
    
    // 使用翻译API翻译提取的文本
    const translationResult = await handleTranslateText(extractedText, settings);
    
    // console.log('翻译结果:', {
    //   translationSuccess: translationResult.success,
    //   translatedTextLength: translationResult.translatedText ? translationResult.translatedText.length : 0,
    //   timestamp: new Date().toISOString()
    // });
    
    if (translationResult.success) {
      return {
        success: true,
        originalText: extractedText,
        translatedText: translationResult.translatedText
      };
    } else {
      return {
        success: false,
        error: translationResult.error || '翻译失败'
      };
    }
  } catch (error) {
    console.error('OCR和翻译处理错误详情:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return { success: false, error: error.message };
  }
}

// 从图片中提取文本
async function extractTextFromImage(imageDataUrl, settings) {
  // 根据OCR提供商选择合适的处理方法
  const ocrProvider = settings.ocrProvider || 'ollama';
  
    // console.log('开始图片文字提取:', {
    //   ocrProvider,
    //   imageDataLength: imageDataUrl.length,
    //   timestamp: new Date().toISOString()
    // });
  
  switch(ocrProvider) {
    case 'ollama':
      // console.log('使用Ollama进行OCR识别');
      return await extractTextWithOllamaOCR(imageDataUrl, settings);
    case 'openrouter':
      if (settings.openrouterOcrApiKey) {
        // console.log('使用OpenRouter进行OCR识别');
        return await extractTextWithOpenRouterOCR(imageDataUrl, settings);
      }
      // console.log('OpenRouter API密钥缺失，回退到Ollama');
      // 如果没有API密钥，回退到Ollama
      return await extractTextWithOllamaOCR(imageDataUrl, settings);
    case 'openai':
      if (settings.openaiOcrApiKey) {
        // console.log('使用OpenAI进行OCR识别');
        return await extractTextWithOpenAIOCR(imageDataUrl, settings);
      }
      // console.log('OpenAI API密钥缺失，回退到Ollama');
      // 如果没有API密钥，回退到Ollama
      return await extractTextWithOllamaOCR(imageDataUrl, settings);
    default:
      // console.log('使用默认Ollama进行OCR识别');
      // 默认使用Ollama
      return await extractTextWithOllamaOCR(imageDataUrl, settings);
  }
}

// 使用Ollama进行OCR识别（视觉模型如LLaVA）
async function extractTextWithOllamaOCR(imageDataUrl, settings) {
  const ollamaUrl = settings.ollamaOcrUrl || settings.ollamaUrl || 'http://localhost:11434';
  const model = settings.ollamaOcrModel || 'llava:latest';
  
  // 重试机制
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // console.log('开始Ollama OCR请求:', {
      //   attempt,
      //   ollamaUrl,
      //   model,
      //   imageDataLength: imageDataUrl.length,
      //   timestamp: new Date().toISOString()
      // });
      
      // 将base64数据URL转换为blob并发送给Ollama
      const base64Data = imageDataUrl.split(',')[1];
      
      // 设置请求超时 - 增加到120秒以处理LLaVA模型的图像处理时间
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        // console.log('Ollama OCR请求超时:', {
        //   attempt,
        //   timeout: 120000,
        //   timestamp: new Date().toISOString()
        // });
        controller.abort(new Error('Ollama OCR请求超时: 120秒内未收到响应'));
      }, 120000); // 120秒超时
      
      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          prompt: "请仔细识别这张图片中的所有文字内容，并将它们完整地提取出来。只需要返回识别到的文字，不要添加任何其他解释。",
          images: [base64Data], // Ollama API接受base64编码的图片
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // console.log('Ollama OCR响应状态:', {
      //   attempt,
      //   status: response.status,
      //   statusText: response.statusText,
      //   timestamp: new Date().toISOString()
      // });
      
      if (!response.ok) {
        const errorDetails = await response.text();
        console.error('Ollama OCR请求失败详细信息:', {
          attempt,
          status: response.status,
          statusText: response.statusText,
          errorDetails: errorDetails,
          timestamp: new Date().toISOString()
        });
        
        // 如果是504网关超时，可能是Ollama处理时间过长，应该重试
        if (response.status === 504) {
          // console.log(`Ollama OCR 504错误，准备重试 (尝试 ${attempt}/${maxRetries})`);
          lastError = new Error(`Ollama OCR请求失败: 504 Gateway Timeout - ${errorDetails.substring(0, 200)}`);
          
          if (attempt < maxRetries) {
            // 等待一段时间后重试，指数退避
            const delay = Math.pow(2, attempt) * 1000; // 2秒, 4秒, 8秒...
            // console.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        throw new Error(`Ollama OCR请求失败: ${response.status} - ${errorDetails.substring(0, 200)}`);
      }
      
      const data = await response.json();
      // console.log('Ollama OCR响应数据:', {
      //   attempt,
      //   responseLength: data.response ? data.response.length : 0,
      //   hasOutput: !!data.output,
      //   timestamp: new Date().toISOString()
      // });
      
      return data.response || data.output || '';
    } catch (error) {
      console.error('Ollama OCR处理失败详情:', {
        attempt,
        message: error.message,
        name: error.name,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // 优化AbortError的重试处理，包括signal is aborted without reason的情况
      if (error.name === 'AbortError' || error.message.includes('aborted') || error.message.includes('timeout')) {
        // console.log(`检测到中断错误，准备重试: ${error.message}`);
        lastError = new Error(`Ollama OCR请求超时或被中断: 120秒内未收到响应 - ${error.message} (尝试 ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
         const delay = Math.pow(2, attempt) * 1000; // 指数退避
         // console.log(`等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      } else {
        lastError = error;
      }
      
      if (attempt === maxRetries) {
        // 所有重试都失败了
        console.error('Ollama OCR所有重试都失败:', {
          error: error.message,
          totalAttempts: maxRetries,
          timestamp: new Date().toISOString()
        });
        throw lastError;
      }
    }
  }
  
  // 这行不应该被执行，但为了类型安全返回
  throw lastError;
}

// 使用OpenRouter进行OCR识别
async function extractTextWithOpenRouterOCR(imageDataUrl, settings) {
  const apiKey = settings.openrouterOcrApiKey;
  const model = settings.openrouterOcrModel || 'llava-hf/llava-1.5-7b-hf';
  
  try {
    const base64Data = imageDataUrl.split(',')[1];
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请仔细识别这张图片中的所有文字内容，并将它们完整地提取出来。只需要返回识别到的文字，不要添加任何其他解释。"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter OCR请求失败: ${errorData.error?.message || response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenRouter OCR处理失败:', error);
    throw error;
  }
}

// 使用OpenAI进行OCR识别
async function extractTextWithOpenAIOCR(imageDataUrl, settings) {
  const apiKey = settings.openaiOcrApiKey;
  const model = settings.openaiOcrModel || 'gpt-4o';
  const baseUrl = settings.openaiBaseUrl || 'https://api.openai.com/v1';
  
  try {
    const base64Data = imageDataUrl.split(',')[1];
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请仔细识别这张图片中的所有文字内容，并将它们完整地提取出来。只需要返回识别到的文字，不要添加任何其他解释。"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI OCR请求失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('OpenAI OCR处理失败:', error);
    throw error;
  }
}

// 本地OCR提取（模拟，在实际部署时会被真实OCR服务替代）
async function simulateOCRExtraction(imageDataUrl, settings) {
  // 这里只是本地模拟，实际的OCR服务会分析图片并返回其中的文字
  // 在真实实现中，你可以：
  // 1. 调用云端OCR服务API（如Google Vision API、Azure Computer Vision等）
  // 2. 使用客户端OCR库（如Tesseract.js）
  // 3. 或者结合两者作为备用方案
  
  // 模拟延迟
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 返回示例文本，实际应从图片中提取
  // 在实际应用中，这里应该调用真实的OCR服务
  return `这是一段从图片中识别出的文本示例。实际的OCR服务会分析您提供的图片，并返回其中包含的文字内容。您可以将这段文字翻译成${settings.targetLang}。`;
}



// 处理翻译文本请求
async function handleTranslateText(text, settings) {
  try {
    if (settings.provider === 'openrouter') {
      const translatedText = await translateWithOpenRouter(text, settings);
      return { success: true, translatedText };
    } else if (settings.provider === 'openai') {
      const translatedText = await translateWithOpenAI(text, settings);
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

// ===== 流式翻译支持 =====

// Ollama 流式翻译
// 清理 HTTP header 值，移除非 ISO-8859-1 字符
function sanitizeHeaderValue(value) {
  if (!value) return value;
  // 移除非 ISO-8859-1 字符 (只保留 0-255 范围的字符)
  return value.replace(/[^\x00-\xFF]/g, '').trim();
}

async function translateWithOllamaStream(text, settings, onChunk) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;

  const response = await fetch(`${settings.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.modelName,
      prompt: prompt,
      stream: true
    })
  });

  if (!response.ok) {
    let errorMessage = `Ollama API 错误: ${response.status}`;
    if (response.status === 404) {
      errorMessage += ` - 模型 "${settings.modelName}" 不存在或 Ollama 服务未运行。`;
    }
    throw new Error(errorMessage);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim());

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.response) {
          fullText += data.response;
          onChunk(data.response);
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return fullText.trim();
}

// OpenRouter 流式翻译
async function translateWithOpenRouterStream(text, settings, onChunk) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;

  const appName = settings.openrouterAppName || 'Ollama Translation Extension';
  const encodedAppName = encodeURIComponent(appName);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sanitizeHeaderValue(settings.openrouterApiKey)}`,
      'HTTP-Referer': settings.openrouterSiteUrl || 'https://localhost',
      'X-Title': encodedAppName
    },
    body: JSON.stringify({
      model: settings.openrouterModel,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`OpenRouter API 错误: ${errorData.error?.message || response.status}`);
  }

  return await parseSSEStream(response, onChunk);
}

// OpenAI 流式翻译
async function translateWithOpenAIStream(text, settings, onChunk) {
  const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;

  const baseUrl = settings.openaiBaseUrl || 'https://api.openai.com/v1';
  const apiUrl = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${sanitizeHeaderValue(settings.openaiApiKey)}`
  };

  if (settings.openaiOrganization) {
    headers['OpenAI-Organization'] = sanitizeHeaderValue(settings.openaiOrganization);
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({
      model: settings.openaiModel || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      stream: true
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `OpenAI API 错误: ${response.status}`;
    try {
      const errorData = JSON.parse(errorText);
      errorMessage += ` - ${errorData.error?.message || errorData.message || '未知错误'}`;
    } catch (e) {
      errorMessage += ` - ${errorText}`;
    }
    throw new Error(errorMessage);
  }

  return await parseSSEStream(response, onChunk);
}

// 解析 SSE 流（OpenAI/OpenRouter 通用）
async function parseSSEStream(response, onChunk) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') continue;

      try {
        const data = JSON.parse(dataStr);
        const content = data.choices?.[0]?.delta?.content;
        if (content) {
          fullText += content;
          onChunk(content);
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }

  return fullText.trim();
}

// 处理流式翻译的端口连接
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'streaming-translate') return;

  port.onMessage.addListener(async (request) => {
    if (request.action !== 'translateTextStream') return;

    const { text, settings } = request;

    try {
      const onChunk = (chunk) => {
        port.postMessage({ type: 'chunk', content: chunk });
      };

      if (settings.provider === 'openrouter') {
        await translateWithOpenRouterStream(text, settings, onChunk);
      } else if (settings.provider === 'openai') {
        await translateWithOpenAIStream(text, settings, onChunk);
      } else {
        await translateWithOllamaStream(text, settings, onChunk);
      }

      port.postMessage({ type: 'done' });
    } catch (error) {
      console.error('流式翻译错误:', error);
      port.postMessage({ type: 'error', error: error.message });
    }
  });
});

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

// 插件图标点击事件 - 打开 Side Panel
chrome.action.onClicked.addListener(async (tab) => {
  // 打开 Side Panel
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 当页面完全加载后，检查是否需要自动翻译
  if (changeInfo.status === 'complete' && tab.url) {
    // console.log('页面加载完成:', tab.url);

    // 获取保存的设置
    const result = await chrome.storage.local.get('translateSettings');
    const settings = result.translateSettings || {};

    // 检查是否启用了自动翻译页面功能
    if (settings.autoTranslatePage === true) {
      // console.log('自动翻译页面已启用，开始翻译:', tab.url);

      try {
        // 向content script发送翻译消息
        await chrome.tabs.sendMessage(tabId, {
          action: 'translate',
          settings: {
            provider: settings.provider || 'ollama',
            ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
            modelName: settings.modelName || 'qwen2:7b',
            openrouterApiKey: settings.openrouterApiKey || '',
            openrouterModel: settings.openrouterModel || 'anthropic/claude-3-haiku',
            openrouterSiteUrl: settings.openrouterSiteUrl || '',
            openrouterAppName: settings.openrouterAppName || 'Ollama 翻译插件',
            openaiApiKey: settings.openaiApiKey || '',
            openaiModel: settings.openaiModel || 'gpt-3.5-turbo',
            openaiBaseUrl: settings.openaiBaseUrl || 'https://api.openai.com/v1',
            openaiOrganization: settings.openaiOrganization || '',
            targetLang: settings.targetLang || '中文',
            translateMode: 'page'
          }
        });
        // console.log('自动翻译页面完成');
      } catch (error) {
        console.error('自动翻译页面失败:', error);

        // 如果是因为content script未加载，等待一段时间后重试
        if (error.message.includes('Could not establish connection')) {
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(tabId, {
                action: 'translate',
                settings: {
                  provider: settings.provider || 'ollama',
                  ollamaUrl: settings.ollamaUrl || 'http://localhost:11434',
                  modelName: settings.modelName || 'qwen2:7b',
                  openrouterApiKey: settings.openrouterApiKey || '',
                  openrouterModel: settings.openrouterModel || 'anthropic/claude-3-haiku',
                  openrouterSiteUrl: settings.openrouterSiteUrl || '',
                  openrouterAppName: settings.openrouterAppName || 'Ollama 翻译插件',
                  openaiApiKey: settings.openaiApiKey || '',
                  openaiModel: settings.openaiModel || 'gpt-3.5-turbo',
                  openaiBaseUrl: settings.openaiBaseUrl || 'https://api.openai.com/v1',
                  openaiOrganization: settings.openaiOrganization || '',
                  targetLang: settings.targetLang || '中文',
                  translateMode: 'page'
                }
              });
               // console.log('自动翻译页面重试成功');
            } catch (retryError) {
              console.error('自动翻译页面重试失败:', retryError);
            }
          }, 1000);
        }
      }
    }
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'local' && changes.translateSettings) {
    const oldValue = changes.translateSettings.oldValue || {};
    const newValue = changes.translateSettings.newValue || {};

    // console.log('翻译设置已更新:', { oldValue, newValue });

    // 检查autoTranslatePage设置是否发生变化
    if (oldValue.autoTranslatePage !== newValue.autoTranslatePage) {
      // console.log('autoTranslatePage设置已更改:', { oldValue: oldValue.autoTranslatePage, newValue: newValue.autoTranslatePage });

      // 如果autoTranslatePage从true变为false，则需要恢复所有已打开页面的原文
      if (oldValue.autoTranslatePage === true && newValue.autoTranslatePage === false) {
        // console.log('自动翻译页面功能已关闭，正在恢复所有已打开页面的原文');

        // 获取所有已打开的标签页
        const tabs = await chrome.tabs.query({});

        for (const tab of tabs) {
          if (tab.url && tab.id) {
            try {
              // 首先中断任何正在进行的翻译，然后恢复原文
              // 发送页面实例ID以确保只影响正确的页面实例
              await chrome.tabs.sendMessage(tab.id, {
                action: 'cancelAndRestore',
                pageInstanceId: Date.now() + Math.random() // 生成临时ID用于此操作
              });
              // console.log(`已向标签页 ${tab.id} 发送取消翻译并恢复原文指令`);
            } catch (error) {
              try {
                // 如果cancelAndRestore失败（可能因为页面正在加载或其他原因），尝试直接恢复
                await chrome.tabs.sendMessage(tab.id, {
                  action: 'restore'
                });
                 // console.log(`已向标签页 ${tab.id} 发送恢复原文指令`);
              } catch (secondError) {
                // 如果标签页没有content script（如扩展页面或受限页面），则忽略错误
                // 也可能是因为页面正在加载或已经离开，这也属于正常情况
                 // console.log(`标签页 ${tab.id} 无法接收恢复指令:`, secondError.message);
              }
            }
          }
        }
      }
    }
  }
});

// 保持Service Worker活跃（可选）
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // 执行一些轻量级操作以保持Service Worker活跃
    // console.log('Service Worker keep-alive ping');
  }
});
