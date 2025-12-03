// 解忧通知助手 - 支持Markdown格式
// 当页面加载完成后显示Markdown格式的欢迎对话框

// 引入必要的库
async function loadRequiredLibraries() {
    try {
        // 首先加载marked.js库
        await loadScript(
            "scripts/extensions/third-party/hello-world-plugin/marked.min.js"
        );
        // 然后加载DOMPurify库以确保安全性
        await loadScript(
            "scripts/extensions/third-party/hello-world-plugin/purify.min.js"
        );

        // 配置marked选项
        if (typeof marked !== "undefined") {
            marked.setOptions({
                breaks: true,
                gfm: true,
                sanitize: false, // 由DOMPurify负责净化
            });
        }

        console.log("所有必要的库加载完成");
    } catch (error) {
        console.error("库加载失败:", error);
        throw error;
    }
}

// 通用脚本加载函数
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => {
            resolve();
        };
        script.onerror = () => reject(new Error(`${src} 加载失败`));
        document.head.appendChild(script);
    });
}

console.log("解忧通知助手已加载");

// 检测设备类型和屏幕尺寸
function detectDevice() {
    const width = window.innerWidth;
    const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
        ) || width <= 768;
    const isSmallScreen = width <= 480;

    return {
        isMobile: isMobile,
        isSmallScreen: isSmallScreen,
        width: width,
    };
}

// 使用marked.js和DOMPurify解析并安全地渲染Markdown
function parseMarkdown(text) {
    try {
        // 首先检查输入是否为有效的字符串
        if (!text || typeof text !== "string") {
            console.error("无效的Markdown内容");
            return "<p>无有效内容</p>";
        }

        if (typeof marked !== "undefined") {
            // 使用marked.js解析markdown
            let html = marked.parse(text);

            // 应用主题样式
            html = html.replace(
                /<h1/g,
                '<h1 style="color: var(--SmartThemeBodyColor); margin: 0.5em 0;"'
            );
            html = html.replace(
                /<h2/g,
                '<h2 style="color: var(--SmartThemeBodyColor); margin: 0.5em 0;"'
            );
            html = html.replace(
                /<h3/g,
                '<h3 style="color: var(--SmartThemeBodyColor); margin: 0.5em 0;"'
            );
            html = html.replace(
                /<a /g,
                '<a style="color: var(--active); text-decoration: underline;" '
            );
            html = html.replace(
                /<code/g,
                '<code style="background-color: rgba(255,255,255,0.1); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace;"'
            );
            html = html.replace(
                /<ul/g,
                '<ul style="text-align: left; color: var(--SmartThemeBodyColor);"'
            );
            html = html.replace(
                /<ol/g,
                '<ol style="text-align: left; color: var(--SmartThemeBodyColor);"'
            );
            html = html.replace(/<p/g, '<p style="margin: 0.5em 0;"');

            // 使用DOMPurify进行HTML净化，防止XSS攻击
            if (typeof DOMPurify !== "undefined") {
                return DOMPurify.sanitize(html);
            } else {
                console.warn("DOMPurify未加载，跳过HTML净化");
                return html; // 备用情况，但会有安全风险
            }
        } else {
            console.error("marked.js未加载，无法解析Markdown");
            // 回退方案：简单的文本处理并转义HTML
            const escapedText = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;")
                .replace(/\n/g, "<br>");
            return `<p>${escapedText}</p>`;
        }
    } catch (error) {
        console.error("解析Markdown时出错:", error);
        const safeErrorText = String(error)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
        return `<p>解析内容时出错: ${safeErrorText}</p>`;
    }
}

// 从API获取最新通知
async function fetchLatestNotice() {
    try {
        // 添加超时处理
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(
            "https://h2st2.jove.life:3261/api/get_latest_notice",
            {
                signal: controller.signal,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                method: "GET",
            }
        );

        clearTimeout(timeoutId); // 清除超时定时器

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 验证返回数据的格式
        if (data.success && data.data) {
            // 验证id和content是否存在且有效
            if (
                typeof data.data.id === "number" &&
                typeof data.data.content === "string"
            ) {
                return data.data; // 返回完整的数据对象
            } else {
                throw new Error("API返回的数据格式不完整");
            }
        } else {
            throw new Error("API返回数据格式不正确");
        }
    } catch (error) {
        console.error("获取最新通知失败:", error);
        // 返回默认数据
        return {
            id: Date.now(), // 使用当前时间戳作为默认id
            content: `# 获取通知失败`,
        };
    }
}

// 使用DOMContentLoaded事件确保页面完全加载
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPlugin);
} else {
    // 如果页面已经加载完成，直接初始化插件
    initPlugin();
}

// 初始化插件
async function initPlugin() {
    try {
        // 加载必要的库
        await loadRequiredLibraries();

        // 显示欢迎消息
        await showWelcomeMessage();
    } catch (error) {
        console.error("插件初始化失败:", error);
        // 即使初始化失败，也尝试显示基本消息
        try {
            showWelcomeMessage(true);
        } catch (fallbackError) {
            console.error("备用方案也失败:", fallbackError);
        }
    }
}

async function showWelcomeMessage(fallbackMode = false) {
    try {
        // 获取通知数据
        let noticeData;
        if (fallbackMode) {
            // 备用模式：使用本地默认内容
            noticeData = {
                id: Date.now(), // 使用当前时间戳作为默认id
                content: `
# 获取通知失败`,
            };
        } else {
            // 正常模式：从API获取内容
            noticeData = await fetchLatestNotice();
        }

        // 检查本地存储中是否已经显示过该通知
        const storageKey = "last_notice_id";
        const lastNoticeId = localStorage.getItem(storageKey);

        // 如果通知ID已存在，则不显示对话框
        if (lastNoticeId && parseInt(lastNoticeId) === noticeData.id) {
            console.log("该通知已显示过，跳过");
            return;
        }

        // 否则创建自定义模态对话框面板
        await createModalPanel(noticeData);

        // 存储当前通知ID到本地存储的操作已移至确认按钮点击事件中
    } catch (error) {
        console.error("显示欢迎面板时出错:", error);
        // 作为最后的备选方案，回退到alert
        alert("欢迎使用解忧通知助手！");
    }

    async function createModalPanel(noticeData) {
        // 检测设备类型
        const device = detectDevice();

        // 创建背景遮罩
        const overlay = document.createElement("div");
        overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(calc(var(--SmartThemeBlurStrength) / 2));
        padding: ${device.isMobile ? "10px" : "20px"};
        box-sizing: border-box;
        // 添加额外的居中对齐确保在所有设备上都居中
        text-align: center;
        // 确保在所有浏览器中都居中
        -webkit-box-align: center;
        -webkit-box-pack: center;
    `;

        // 创建内容面板
        const panel = document.createElement("div");
        panel.style.cssText = `
        background-color: var(--SmartThemeChatTintColor);
        border-radius: 8px;
        padding: ${device.isSmallScreen ? "20px" : "24px"};
        width: ${device.isMobile ? "95%" : "90%"};
        max-width: ${
            device.isSmallScreen ? "300px" : device.isMobile ? "350px" : "400px"
        };
        box-shadow: 0 4px 16px var(--SmartThemeShadowColor);
        text-align: center;
        border: 1px solid var(--SmartThemeBorderColor);
        backdrop-filter: blur(var(--SmartThemeBlurStrength));
        margin: auto;
        position: relative;
        max-height: 80vh;
        overflow-y: auto;
        // 确保在所有设备上都完美居中
        align-self: center;
        // 添加额外的居中属性确保兼容性
        -webkit-align-self: center;
        // 确保面板在容器中垂直居中
        vertical-align: middle;
    `;

        // 创建标题
        const title = document.createElement("h2");
        title.textContent = "解忧通知助手";
        title.style.cssText = `
        margin-top: 0;
        color: var(--SmartThemeBodyColor);
        font-size: ${device.isSmallScreen ? "18px" : "20px"};
        margin-bottom: 16px;
        font-family: var(--mainFontFamily);
    `;

        // 创建消息内容容器
        const messageContainer = document.createElement("div");
        messageContainer.innerHTML = parseMarkdown(noticeData.content);
        messageContainer.style.cssText = `
        color: var(--SmartThemeEmColor);
        margin-bottom: 24px;
        line-height: 1.5;
        font-family: var(--mainFontFamily);
        text-align: left;
        overflow-wrap: break-word;
        font-size: ${device.isSmallScreen ? "14px" : "var(--mainFontSize)"};
    `;

        // 创建确认按钮（深色主题）
        const confirmButton = document.createElement("button");
        confirmButton.textContent = "确定";
        confirmButton.style.cssText = `
        background-color: var(--SmartThemeBtnColor);
        color: var(--SmartThemeBtnTextColor);
        border: 1px solid var(--SmartThemeBorderColor);
        padding: ${device.isSmallScreen ? "8px 16px" : "10px 20px"};
        border-radius: 4px;
        cursor: pointer;
        font-size: ${device.isSmallScreen ? "14px" : "var(--mainFontSize)"};
        font-family: var(--mainFontFamily);
        transition: background-color 0.3s, transform 0.1s;
    `;

        // 按钮悬停效果
        confirmButton.addEventListener("mouseover", function () {
            this.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
        });

        // 按钮移出效果
        confirmButton.addEventListener("mouseout", function () {
            this.style.backgroundColor = "var(--SmartThemeBtnColor)";
        });

        // 按钮点击效果
        confirmButton.addEventListener("mousedown", function () {
            this.style.transform = "scale(0.98)";
        });

        confirmButton.addEventListener("mouseup", function () {
            this.style.transform = "scale(1)";
        });

        // 关闭面板函数
        function closePanel() {
            document.body.removeChild(overlay);
        }

        // 按钮点击事件 - 存储ID并关闭面板
        confirmButton.addEventListener("click", () => {
            localStorage.setItem("last_notice_id", noticeData.id);
            closePanel();
        });

        // 点击背景也可以关闭面板
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                closePanel();
            }
        });

        // 组装面板
        panel.appendChild(title);
        panel.appendChild(messageContainer);
        panel.appendChild(confirmButton);

        // 调整面板宽度以适应Markdown内容
        panel.style.maxWidth = "500px";
        overlay.appendChild(panel);

        // 添加到页面
        document.body.appendChild(overlay);

        // 为元素添加ID以便调试
        panel.id = "hello-world-plugin-panel";
        overlay.id = "hello-world-plugin-overlay";
        title.id = "hello-world-plugin-title";
        messageContainer.id = "hello-world-plugin-message";
        confirmButton.id = "hello-world-plugin-button";

        // 添加窗口大小改变监听，确保响应式
        window.addEventListener("resize", function () {
            const newDevice = detectDevice();

            // 更新面板样式
            panel.style.width = newDevice.isMobile ? "95%" : "90%";
            panel.style.maxWidth = newDevice.isSmallScreen
                ? "300px"
                : newDevice.isMobile
                ? "350px"
                : "400px";
            panel.style.padding = newDevice.isSmallScreen ? "20px" : "24px";

            // 更新标题样式
            title.style.fontSize = newDevice.isSmallScreen ? "18px" : "20px";

            // 更新消息容器样式
            messageContainer.style.fontSize = newDevice.isSmallScreen
                ? "14px"
                : "var(--mainFontSize)";

            // 更新按钮样式
            confirmButton.style.padding = newDevice.isSmallScreen
                ? "8px 16px"
                : "10px 20px";
            confirmButton.style.fontSize = newDevice.isSmallScreen
                ? "14px"
                : "var(--mainFontSize)";

            // 更新遮罩层样式
            overlay.style.padding = newDevice.isMobile ? "10px" : "20px";

            // 确保面板始终保持居中
            panel.style.alignSelf = "center";
            panel.style.webkitAlignSelf = "center";
            panel.style.verticalAlign = "middle";
            overlay.style.textAlign = "center";
            overlay.style.webkitBoxAlign = "center";
            overlay.style.webkitBoxPack = "center";
        });
    }
}

// 为了确保插件被正确识别和加载，我们可以添加一个简单的导出
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = {
        name: "解忧通知助手",
        version: "1.0.0",
    };
}
