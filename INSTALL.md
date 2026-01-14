# Ollama 网页翻译插件 - 安装指南

本文档将指导您完成 Ollama 网页翻译 Chrome 插件的完整安装和配置过程。

## 目录

1. [系统要求](#系统要求)
2. [安装 Ollama](#安装-ollama)
3. [准备图标文件](#准备图标文件)
4. [安装 Chrome 插件](#安装-chrome-插件)
5. [配置插件](#配置插件)
6. [测试翻译功能](#测试翻译功能)
7. [常见问题](#常见问题)

---

## 系统要求

- **操作系统**：Windows、macOS 或 Linux
- **浏览器**：Chrome 88+ 或其他基于 Chromium 的浏览器（Edge、Brave 等）
- **Ollama**：需要安装并运行 Ollama 服务
- **内存**：建议至少 8GB RAM（取决于使用的模型大小）

---

## 安装 Ollama

### Windows

1. 访问 [Ollama 官网](https://ollama.com)
2. 下载 Windows 安装程序
3. 运行安装程序并按照提示完成安装
4. 打开命令提示符或 PowerShell，验证安装：

```bash
ollama --version
```

### macOS

1. 使用 Homebrew 安装（推荐）：

```bash
brew install ollama
```

2. 或访问 [Ollama 官网](https://ollama.com) 下载 macOS 安装程序

3. 验证安装：

```bash
ollama --version
```

### Linux

1. 使用官方安装脚本：

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

2. 验证安装：

```bash
ollama --version
```

---

## 启动 Ollama 服务

### Windows

打开命令提示符或 PowerShell，运行：

```bash
ollama serve
```

### macOS / Linux

打开终端，运行：

```bash
ollama serve
```

**注意**：保持此终端窗口打开，Ollama 服务需要持续运行。

---

## 下载翻译模型

推荐使用支持中文的模型，例如 `qwen2:7b`：

```bash
ollama pull qwen2:7b
```

其他可选模型：

```bash
# 较小的模型（速度更快）
ollama pull qwen2:1.5b

# 其他支持中文的模型
ollama pull llama3:8b
ollama pull gemma:7b
```

查看已安装的模型：

```bash
ollama list
```

---

## 准备图标文件

项目提供了内置的图标生成器，可以快速生成所需图标：

### 使用内置图标生成器（推荐）

1. 在浏览器中打开项目根目录下的 [`generate-icons.html`](generate-icons.html:1) 文件
2. 点击"下载所有图标"按钮
3. 将下载的三个图标文件保存到 `icons` 文件夹中：
   - `icon16.png` (16x16 像素)
   - `icon48.png` (48x48 像素)
   - `icon128.png` (128x128 像素)

图标采用渐变紫色设计，包含翻译符号，与插件主题完美匹配。

### 选项 1：使用在线图标生成器

1. 访问 [Favicon Generator](https://www.favicon-generator.org/)
2. 上传您的图片或使用模板
3. 生成并下载 16x16、48x48 和 128x128 的 PNG 图标
4. 将文件重命名为：
   - `icon16.png`
   - `icon48.png`
   - `icon128.png`
5. 将这三个文件放入项目的 `icons` 文件夹中

### 选项 2：创建简单的占位图标

如果您暂时没有合适的图标，可以：

1. 下载任何 PNG 图片
2. 使用在线工具（如 [Canva](https://www.canva.com/)）调整尺寸
3. 保存为所需尺寸并重命名

### 选项 3：使用 AI 生成

使用 AI 图像生成工具（如 DALL-E、Midjourney 等）创建图标，然后调整尺寸。

---

## 安装 Chrome 插件

### 步骤 1：准备插件文件

确保您的项目文件夹包含以下文件：

```
translate/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── content.js
├── background.js
├── generate-icons.html  # 图标生成器
├── icons/
│   ├── icon16.png     # 需要生成
│   ├── icon48.png     # 需要生成
│   └── icon128.png    # 需要生成
├── README.md
├── INSTALL.md
└── QUICKSTART.md
```

**重要**：使用 [`generate-icons.html`](generate-icons.html:1) 生成图标文件并保存到 `icons` 文件夹中。

### 步骤 2：在 Chrome 中安装

1. 打开 Chrome 浏览器
2. 在地址栏输入：`chrome://extensions/`
3. 开启右上角的 **"开发者模式"** 开关
4. 点击左上角的 **"加载已解压的扩展程序"** 按钮
5. 在文件选择器中，选择本项目的 `translate` 文件夹
6. 点击"选择文件夹"

### 步骤 3：验证安装

安装成功后，您应该看到：

- 插件出现在扩展列表中
- 浏览器工具栏出现插件图标
- 没有错误提示

如果看到错误，请检查：
- 所有必需文件是否存在
- `manifest.json` 格式是否正确
- 图标文件是否存在

---

## 配置插件

### 1. 打开插件设置

点击浏览器工具栏中的插件图标，打开设置界面。

### 2. 配置 Ollama 服务地址

- **默认地址**：`http://localhost:11434`
- 如果您的 Ollama 服务运行在其他端口，请相应修改
- 例如：`http://localhost:11435`

### 3. 设置模型名称

输入您下载的模型名称，例如：

- `qwen2:7b`
- `qwen2:1.5b`
- `llama3:8b`

### 4. 选择目标语言

从下拉菜单中选择您想要翻译到的语言：

- 中文
- English (英语)
- 日本語 (日语)
- 한국어 (韩语)
- Français (法语)
- Deutsch (德语)
- Español (西班牙语)

### 5. 选择翻译模式

- **选中文字**：翻译您在网页上选中的文本
- **整个页面**：翻译当前网页的所有文本内容
- **悬停翻译**：鼠标悬停在文本上时显示翻译

### 6. 保存设置

点击"保存设置"按钮，您的配置将被保存。

---

## 测试翻译功能

### 测试 1：翻译选中文字

1. 打开任意网页（建议使用英文网页测试）
2. 选中一段文本
3. 点击插件图标，确保模式为"选中文字"
4. 点击"翻译"按钮
5. 查看翻译结果弹窗

**预期结果**：显示原文和译文，可以复制译文。

### 测试 2：使用右键菜单

1. 选中一段文本
2. 右键点击
3. 选择"翻译选中文字"
4. 查看翻译结果

**预期结果**：与测试 1 相同。

### 测试 3：翻译整个页面

1. 打开一个简单的网页
2. 点击插件图标，选择"整个页面"模式
3. 点击"翻译"按钮
4. 等待翻译完成

**预期结果**：页面文本被翻译，可以通过右键菜单"恢复原文"恢复。

### 测试 4：悬停翻译

1. 点击插件图标，选择"悬停翻译"模式
2. 点击"翻译"按钮
3. 将鼠标悬停在文本上
4. 等待翻译提示出现

**预期结果**：悬停时显示翻译提示框。

---

## 常见问题

### Q1: 插件无法连接到 Ollama

**症状**：翻译时提示连接错误

**解决方案**：

1. 确认 Ollama 服务正在运行：

```bash
# Windows
ollama serve

# macOS/Linux
ollama serve
```

2. 检查服务地址是否正确（默认 `http://localhost:11434`）

3. 测试连接：在浏览器中访问 `http://localhost:11434/api/tags`

4. 检查防火墙设置

### Q2: 翻译速度很慢

**症状**：翻译需要很长时间

**解决方案**：

1. 使用更小的模型（如 `qwen2:1.5b`）
2. 减少翻译的文本量
3. 检查系统资源使用情况
4. 关闭其他占用大量内存的应用程序

### Q3: 翻译质量不好

**症状**：翻译结果不准确或不通顺

**解决方案**：

1. 使用更大的模型（如 `qwen2:7b`）
2. 确保模型支持源语言和目标语言
3. 尝试不同的模型（如 `llama3:8b`）

### Q4: 插件图标不显示

**症状**：浏览器工具栏没有插件图标

**解决方案**：

1. 检查 `icons` 文件夹中是否有三个图标文件
2. 确认图标文件格式为 PNG
3. 刷新扩展页面：`chrome://extensions/`
4. 重新加载插件

### Q5: 右键菜单没有翻译选项

**症状**：右键点击时看不到翻译选项

**解决方案**：

1. 刷新当前网页
2. 检查插件是否已启用
3. 重新加载插件
4. 检查浏览器控制台是否有错误

### Q6: 翻译整个页面后无法恢复

**症状**：点击"恢复原文"没有效果

**解决方案**：

1. 刷新网页
2. 确保使用的是同一个插件
3. 检查浏览器控制台是否有错误

---

## 高级配置

### 自定义翻译提示词

如果您想自定义翻译提示词，可以修改 `content.js` 中的 `translateWithOllama` 函数：

```javascript
const prompt = `请将以下文本翻译成${settings.targetLang}，只返回翻译结果，不要添加任何解释：\n\n${text}`;
```

### 添加更多语言

在 `popup.html` 的 `<select id="target-lang">` 中添加新的选项：

```html
<option value="Italiano">Italiano</option>
<option value="Português">Português</option>
```

### 修改翻译超时时间

在 `content.js` 中，您可以添加超时设置：

```javascript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

const response = await fetch(`${settings.ollamaUrl}/api/generate`, {
  // ... 其他配置
  signal: controller.signal
});

clearTimeout(timeoutId);
```

---

## 卸载插件

1. 打开 `chrome://extensions/`
2. 找到 Ollama 网页翻译插件
3. 点击"移除"按钮
4. 确认移除

---

## 更新插件

如果您修改了插件代码：

1. 打开 `chrome://extensions/`
2. 找到插件
3. 点击刷新按钮 🔄
4. 重新打开插件以应用更改

---

## 获取帮助

如果遇到问题：

1. 查看 [README.md](README.md) 了解更多详情
2. 检查浏览器控制台（F12）查看错误信息
3. 访问 [Ollama 官网](https://ollama.com) 获取帮助
4. 在 GitHub 上提交 Issue

---

## 下一步

安装完成后，您可以：

- 探索不同的翻译模式
- 尝试不同的 Ollama 模型
- 自定义插件设置
- 为项目贡献代码

祝您使用愉快！🎉
