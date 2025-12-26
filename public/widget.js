window.ChatBotWidget = {
  config: null,
  button: null,
  iframe: null,
  isInitialized: false,
  customization: null,

  init: function (config) {
    // Prevent running inside iframe
    if (window.self !== window.top) {
      return;
    }

    // Validate required config
    if (!config || !config.botId) {
      console.error('ChatBotWidget: botId is required');
      return;
    }

    // Store config
    this.config = config;

    // Fetch customization from backend, then render
    this.fetchCustomization();

    // Listen for route changes (for SPAs like React Router)
    this.setupRouteChangeListeners();

    this.isInitialized = true;
  },

  fetchCustomization: async function () {
    try {
      const response = await fetch(
        `https://tastebot-studio-backend-gvvb.onrender.com/api/bots/customisation/${this.config.botId}`
      );
      const data = await response.json();

      this.customization = data.result || {};
      console.log('ChatBotWidget: Customization loaded', this.customization);

      // Initial check and render after customization is loaded
      this.checkAndRender();
    } catch (error) {
      console.error('ChatBotWidget: Error loading customization', error);
      // Render with default settings if fetch fails
      this.customization = {};
      this.checkAndRender();
    }
  },

  checkAndRender: function () {
    const shouldShow = this.shouldShowOnCurrentPage(this.config.allowedPages);

    if (shouldShow) {
      this.showWidget();
    } else {
      this.hideWidget();
    }
  },

  showWidget: function () {
    // If widget already exists and is visible, do nothing
    if (this.button && this.iframe) {
      this.button.style.display = 'flex';
      console.log('ChatBotWidget: Widget shown');
      return;
    }

    // Create widget if it doesn't exist
    if (!this.button || !this.iframe) {
      this.createWidget();
    }
  },

  hideWidget: function () {
    console.log('ChatBotWidget: Hiding widget - not allowed on this page');

    if (this.button) {
      this.button.style.display = 'none';
    }
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
  },

  applyCustomStyles: function (element, customStyles, defaultStyles) {
    // Apply default styles first
    Object.assign(element.style, defaultStyles);

    // Then apply custom styles if provided (these will override defaults)
    if (customStyles && typeof customStyles === 'object') {
      Object.assign(element.style, customStyles);
    }
  },

  getAnimationCSS: function (animation) {
    const animations = {
      bounce: `
        @keyframes bounce-widget {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `,
      pulse: `
        @keyframes pulse-widget {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `,
      shake: `
        @keyframes shake-widget {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `,
      rotate: `
        @keyframes rotate-widget {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `,
      swing: `
        @keyframes swing-widget {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(15deg); }
          75% { transform: rotate(-15deg); }
        }
      `,
      tada: `
        @keyframes tada-widget {
          0%, 100% { transform: scale(1) rotate(0deg); }
          10%, 20% { transform: scale(0.9) rotate(-3deg); }
          30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
          40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
        }
      `,
      wobble: `
        @keyframes wobble-widget {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          15% { transform: translateX(-25px) rotate(-5deg); }
          30% { transform: translateX(20px) rotate(3deg); }
          45% { transform: translateX(-15px) rotate(-3deg); }
          60% { transform: translateX(10px) rotate(2deg); }
          75% { transform: translateX(-5px) rotate(-1deg); }
        }
      `,
    };
    return animations[animation] || '';
  },

  getHoverAnimationCSS: function (animation) {
    const hoverAnimations = {
      scale: 'transform: scale(1.15) !important;',
      lift: 'transform: translateY(-8px) !important; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3) !important;',
      glow: 'box-shadow: 0 0 25px rgba(155, 93, 229, 0.8) !important;',
      rotate: 'transform: rotate(360deg) !important;',
      bounce: 'animation: bounce-hover-widget 0.5s !important;',
    };
    return hoverAnimations[animation] || '';
  },

  getIconSVG: function (iconType, customIcon, iconValue, color, iconSize) {
    const size = iconSize || '24';
    const iconPaths = {
      chat: 'M2 2v20l4-4h14V2H2zm16 10H6v-2h12v2z',
      message:
        'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
      support:
        'M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z',
      help: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z',
      bot: 'M20 9V7c0-1.1-.9-2-2-2h-3c0-1.66-1.34-3-3-3S9 3.34 9 5H6c-1.1 0-2 .9-2 2v2c-1.66 0-3 1.34-3 3s1.34 3 3 3v4c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-4c1.66 0 3-1.34 3-3s-1.34-3-3-3zM7.5 11.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5S9.83 13 9 13s-1.5-.67-1.5-1.5zM16 17H8v-2h8v2zm-1-4c-.83 0-1.5-.67-1.5-1.5S14.17 10 15 10s1.5.67 1.5 1.5S15.83 13 15 13z',
    };

    if (iconType === 'emoji' && customIcon) {
      return (
        '<span style="font-size: ' + size + 'px;">' + customIcon + '</span>'
      );
    } else if (iconType === 'custom' && customIcon) {
      return customIcon;
    } else if (iconType === 'none') {
      return '';
    } else {
      const path = iconPaths[iconValue] || iconPaths.chat;
      return (
        '<svg xmlns="http://www.w3.org/2000/svg" height="' +
        size +
        '" width="' +
        size +
        '" fill="' +
        color +
        '" viewBox="0 0 24 24"><path d="' +
        path +
        '"/></svg>'
      );
    }
  },

  createWidget: function () {
    // Prevent duplication
    if (
      document.getElementById('chatbot-widget-button') ||
      document.getElementById('chatbot-widget-iframe')
    ) {
      return;
    }

    // Get button customization from backend or use defaults
    const c = this.customization || {};
    const useButtonCustomCSS = c.useButtonCustomCSS || false;

    // Create a style tag for button hover and animations
    const style = document.createElement('style');

    // Default CSS classes
    let defaultCSS = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `;

    // Add animation keyframes if needed
    if (!useButtonCustomCSS) {
      const animation = c.buttonAnimation || 'none';
      if (animation !== 'none') {
        defaultCSS += this.getAnimationCSS(animation);

        // Determine animation duration and timing
        let duration = '2s';
        let timing = 'ease-in-out';

        if (animation === 'rotate') {
          duration = '3s';
          timing = 'linear';
        } else if (animation === 'shake') {
          duration = '0.5s';
        }

        defaultCSS += `
        #chatbot-widget-button {
          animation: ${animation}-widget ${duration} ${timing} infinite;
        }
      `;
      }

      // Add hover animation
      const hoverAnimation = c.buttonHoverAnimation || 'scale';
      if (hoverAnimation !== 'none') {
        defaultCSS += `
        #chatbot-widget-button:hover {
          ${this.getHoverAnimationCSS(hoverAnimation)}
          transition: all 0.3s ease;
        }
      `;
      } else {
        defaultCSS += `
        #chatbot-widget-button:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
          transition: all 0.3s ease;
        }
      `;
      }

      // Add pulse effect
      if (c.buttonPulse) {
        defaultCSS += `
        @keyframes pulse-ring-widget {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        #chatbot-widget-button::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: inherit;
          animation: pulse-ring-widget 2s infinite;
          z-index: -1;
        }
      `;
      }

      // Text bubble styling
      if (c.buttonShowText && c.buttonText) {
        defaultCSS += `
        .chatbot-button-text {
          background: white;
          padding: ${c.buttonPadding || '12'}px;
          border-radius: 20px;
          box-shadow: ${c.buttonShadow || '0 4px 10px rgba(0,0,0,0.3)'};
          color: ${c.buttonTextColor || '#1e293b'};
          font-size: ${c.buttonTextSize || '14'}px;
          white-space: nowrap;
          font-weight: 500;
          animation: fadeIn 0.3s ease-out;
        }
      `;
      }
    }

    // If user provided custom button CSS from backend, append it
    if (useButtonCustomCSS && c.buttonCustomCSS) {
      defaultCSS += '\n' + c.buttonCustomCSS;
    }

    // If user provided custom CSS via init config, append it (backward compatibility)
    if (this.config.customCSS) {
      defaultCSS += '\n' + this.config.customCSS;
    }

    style.innerHTML = defaultCSS;
    document.head.appendChild(style);

    // Determine position and styling values
    const position = c.buttonPosition || this.config.position || 'bottom-right';
    const buttonSize = c.buttonSize || '56';
    const buttonBorderRadius = c.buttonBorderRadius || '50';
    const buttonBackground =
      c.buttonBackground || 'linear-gradient(135deg, #9b5de5, #f15bb5)';
    const buttonColor = c.buttonColor || '#ffffff';
    const buttonBottom = c.buttonBottom || '20';
    const buttonRight = c.buttonRight || '20';
    const buttonLeft = c.buttonLeft || '20';
    const buttonShadow = c.buttonShadow || '0 4px 10px rgba(0,0,0,0.3)';

    // Get button icon with size
    const buttonIconType = c.buttonIconType || 'default';
    const buttonIcon = c.buttonIcon || 'chat';
    const buttonCustomIcon = c.buttonCustomIcon || '';
    const buttonIconSize = c.buttonIconSize || '24';
    const iconHTML = this.getIconSVG(
      buttonIconType,
      buttonCustomIcon,
      buttonIcon,
      buttonColor,
      buttonIconSize
    );

    // Create main button container
    let buttonContainer = document.createElement('div');
    buttonContainer.id = 'chatbot-widget-container';
    buttonContainer.style.cssText = `
    position: fixed;
    bottom: ${buttonBottom}px;
    right: ${position === 'bottom-left' ? 'auto' : buttonRight + 'px'};
    left: ${position === 'bottom-left' ? buttonLeft + 'px' : 'auto'};
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: ${position === 'bottom-left' ? 'flex-start' : 'flex-end'};
    gap: 8px;
  `;

    // Create inner wrapper for button and text label
    const innerWrapper = document.createElement('div');
    innerWrapper.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    ${
      c.buttonShowText && c.buttonText
        ? c.buttonTextPosition === 'right'
          ? 'flex-direction: row;'
          : c.buttonTextPosition === 'left'
            ? 'flex-direction: row-reverse;'
            : c.buttonTextPosition === 'bottom'
              ? 'flex-direction: column;'
              : 'flex-direction: column-reverse;'
        : ''
    }
  `;

    // Create text label if enabled - ALWAYS CREATE IT, regardless of custom CSS
    if (c.buttonShowText && c.buttonText) {
      const textElement = document.createElement('div');
      textElement.className = 'chatbot-button-text';

      // Apply styles based on whether custom CSS is enabled
      if (!useButtonCustomCSS) {
        textElement.style.cssText = `
        background: white;
        padding: ${c.buttonPadding || '12'}px;
        border-radius: 20px;
        box-shadow: ${c.buttonShadow || '0 4px 10px rgba(0,0,0,0.3)'};
        color: ${c.buttonTextColor || '#1e293b'};
        font-size: ${c.buttonTextSize || '14'}px;
        white-space: nowrap;
        font-weight: 500;
      `;
      }
      // If custom CSS is enabled, minimal styling (custom CSS will handle it)
      else {
        textElement.style.cssText = `
        white-space: nowrap;
      `;
      }

      textElement.textContent = c.buttonText;
      innerWrapper.appendChild(textElement);
    }

    // Create the floating button
    this.button = document.createElement('button');
    this.button.id = 'chatbot-widget-button';
    this.button.innerHTML = iconHTML;

    // Default button styles
    const defaultButtonStyles = {
      background: buttonBackground,
      color: buttonColor,
      border: 'none',
      borderRadius: buttonBorderRadius + '%',
      width: buttonSize + 'px',
      height: buttonSize + 'px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: buttonShadow,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
    };

    // If using custom button CSS, only apply minimal properties
    if (useButtonCustomCSS) {
      Object.assign(this.button.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: 'none',
        position: 'relative',
      });
    } else {
      // Apply default styles and custom button styles from config if provided
      this.applyCustomStyles(
        this.button,
        this.config.buttonStyles,
        defaultButtonStyles
      );
    }

    // Add button to inner wrapper
    innerWrapper.appendChild(this.button);

    // Add inner wrapper to container
    buttonContainer.appendChild(innerWrapper);

    // Create "Powered by TasteAI Studio" branding - ALWAYS SHOW
    const brandingElement = document.createElement('div');
    brandingElement.className = 'chatbot-branding';
    brandingElement.style.cssText = `
    display: flex;
    justify-content: ${position === 'bottom-left' ? 'flex-start' : 'flex-end'};
    margin-top: 4px;
  `;

    brandingElement.innerHTML = `
    <a href="https://tastestudio.ai" target="_blank" rel="noopener noreferrer" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: #64748b;
      text-decoration: none;
      opacity: 0.8;
      transition: opacity 0.2s ease;
      padding: 4px 8px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
      <span>Powered by</span>
      <span style="font-weight: 600; color: #3b82f6;">TasteAI Studio</span>
    </a>
  `;

    // Add branding to container
    buttonContainer.appendChild(brandingElement);

    // Toggle iframe visibility on button click
    const self = this;
    this.button.addEventListener('click', function () {
      if (self.iframe.style.display === 'none') {
        self.iframe.style.display = 'block';
      } else {
        self.iframe.style.display = 'none';
      }
    });

    // Create the iframe (initially hidden)
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'chatbot-widget-iframe';
    this.iframe.src = `${this.config.apiUrl}/embed?botId=${this.config.botId}`;

    // Default iframe styles
    const defaultIframeStyles = {
      position: 'fixed',
      bottom: '90px',
      right: position === 'bottom-left' ? 'auto' : buttonRight + 'px',
      left: position === 'bottom-left' ? buttonLeft + 'px' : 'auto',
      width: '360px',
      height: '500px',
      border: 'none',
      borderRadius: '12px',
      zIndex: '9999',
      display: 'none',
      animation: 'fadeIn 0.3s ease-out',
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    };

    // Apply default styles and custom iframe styles if provided
    this.applyCustomStyles(
      this.iframe,
      this.config.iframeStyles,
      defaultIframeStyles
    );

    // Append elements to the DOM
    document.body.appendChild(buttonContainer);
    document.body.appendChild(this.iframe);

    console.log('ChatBotWidget: Widget created successfully with branding');
  },

  setupRouteChangeListeners: function () {
    const self = this;

    // Listen for popstate (browser back/forward buttons)
    window.addEventListener('popstate', function () {
      console.log('ChatBotWidget: Route changed (popstate)');
      setTimeout(function () {
        self.checkAndRender();
      }, 100);
    });

    // Listen for pushState and replaceState (React Router navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
      originalPushState.apply(this, arguments);
      console.log('ChatBotWidget: Route changed (pushState)');
      setTimeout(function () {
        self.checkAndRender();
      }, 100);
    };

    history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      console.log('ChatBotWidget: Route changed (replaceState)');
      setTimeout(function () {
        self.checkAndRender();
      }, 100);
    };

    // Also listen for hashchange (for hash-based routing)
    window.addEventListener('hashchange', function () {
      console.log('ChatBotWidget: Route changed (hashchange)');
      setTimeout(function () {
        self.checkAndRender();
      }, 100);
    });

    console.log('ChatBotWidget: Route change listeners set up');
  },

  shouldShowOnCurrentPage: function (allowedPages) {
    // If no allowedPages specified, show on all pages
    if (!allowedPages || allowedPages.length === 0) {
      return true;
    }

    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    const currentOrigin = window.location.origin;

    console.log('ChatBotWidget: Checking page access', {
      currentUrl: currentUrl,
      currentPath: currentPath,
      allowedPages: allowedPages,
    });

    // Check each allowed page pattern
    for (let i = 0; i < allowedPages.length; i++) {
      const pattern = allowedPages[i];
      if (
        this.matchesPattern(pattern, currentUrl, currentPath, currentOrigin)
      ) {
        console.log('ChatBotWidget: Page matched pattern:', pattern);
        return true;
      }
    }

    console.log('ChatBotWidget: No pattern matched. Widget will not be shown.');
    return false;
  },

  matchesPattern: function (pattern, currentUrl, currentPath, currentOrigin) {
    // Remove trailing slashes for consistent comparison
    const normalizedPattern = pattern.replace(/\/$/, '');
    const normalizedUrl = currentUrl.replace(/\/$/, '');
    const normalizedPath = currentPath.replace(/\/$/, '');

    // 1. Exact URL match
    if (normalizedPattern === normalizedUrl) {
      return true;
    }

    // 2. Exact path match
    if (normalizedPattern === normalizedPath) {
      return true;
    }

    // 3. Path-only pattern (starts with /)
    if (pattern.startsWith('/')) {
      // Check if pattern contains wildcard
      if (pattern.includes('*')) {
        return this.wildcardMatch(pattern, currentPath);
      }

      // Check if pattern is a base path (e.g., /edit should match /edit/123)
      if (currentPath.startsWith(normalizedPattern + '/')) {
        return true;
      }

      // Exact path match already checked above
      return false;
    }

    // 4. Full URL with wildcard
    if (pattern.includes('*')) {
      return this.wildcardMatch(pattern, currentUrl);
    }

    // 5. Relative path match (append to origin)
    const fullPatternUrl = pattern.startsWith('http')
      ? pattern
      : currentOrigin + (pattern.startsWith('/') ? '' : '/') + pattern;

    if (fullPatternUrl.replace(/\/$/, '') === normalizedUrl) {
      return true;
    }

    return false;
  },

  wildcardMatch: function (pattern, str) {
    // Remove trailing slashes for consistent matching
    const normalizedPattern = pattern.replace(/\/$/, '');
    const normalizedStr = str.replace(/\/$/, '');

    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const escapeRegex = function (s) {
      return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    };

    // Split by * and escape each part, then join with .*
    const parts = normalizedPattern.split('*');
    const escapedParts = [];
    for (let i = 0; i < parts.length; i++) {
      escapedParts.push(escapeRegex(parts[i]));
    }
    const regexPattern = '^' + escapedParts.join('.*') + '$';

    const regex = new RegExp(regexPattern);
    return regex.test(normalizedStr);
  },
};
