window.ChatBotWidget = {
  config: null,
  button: null,
  iframe: null,
  isInitialized: false,

  init: function (config) {
    // Prevent running inside iframe
    if (window.self !== window.top) return;

    // Validate required config
    if (!config || !config.botId) {
      console.error('ChatBotWidget: botId is required');
      return;
    }

    // Store config
    this.config = config;

    // Initial check and render
    this.checkAndRender();

    // Listen for route changes (for SPAs like React Router)
    this.setupRouteChangeListeners();

    this.isInitialized = true;
  },

  checkAndRender: function() {
    const shouldShow = this.shouldShowOnCurrentPage(this.config.allowedPages);
    
    if (shouldShow) {
      this.showWidget();
    } else {
      this.hideWidget();
    }
  },

  showWidget: function() {
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

  hideWidget: function() {
    console.log('ChatBotWidget: Hiding widget - not allowed on this page');
    
    if (this.button) {
      this.button.style.display = 'none';
    }
    if (this.iframe) {
      this.iframe.style.display = 'none';
    }
  },

  createWidget: function() {
    // Prevent duplication
    if (document.getElementById("chatbot-widget-button") || document.getElementById("chatbot-widget-iframe")) {
      return;
    }

    // Create a style tag for button hover and animations
    const style = document.createElement("style");
    style.innerHTML = `
      #chatbot-widget-button:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 12px rgba(0, 0, 0, 0.3);
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);

    // Create the floating circular button
    this.button = document.createElement("button");
    this.button.id = "chatbot-widget-button";
    this.button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="white" viewBox="0 0 24 24">
        <path d="M2 2v20l4-4h14V2H2zm16 10H6v-2h12v2z"/>
      </svg>
    `;
    Object.assign(this.button.style, {
      position: "fixed",
      bottom: this.config.position === "bottom-left" ? "20px" : "20px",
      right: this.config.position === "bottom-left" ? "auto" : "20px",
      left: this.config.position === "bottom-left" ? "20px" : "auto",
      zIndex: "9999",
      background: "linear-gradient(135deg, #9b5de5, #f15bb5)",
      color: "#fff",
      border: "none",
      borderRadius: "50%",
      width: "56px",
      height: "56px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
      cursor: "pointer",
      transition: "transform 0.2s, box-shadow 0.2s",
    });

    // Create the iframe (initially hidden)
    this.iframe = document.createElement("iframe");
    this.iframe.id = "chatbot-widget-iframe";
    this.iframe.src = `${this.config.apiUrl}/embed?botId=${this.config.botId}`;
    Object.assign(this.iframe.style, {
      position: "fixed",
      bottom: "90px",
      right: this.config.position === "bottom-left" ? "auto" : "20px",
      left: this.config.position === "bottom-left" ? "20px" : "auto",
      width: "360px",
      height: "500px",
      border: "none",
      borderRadius: "12px",
      zIndex: "9999",
      display: "none",
      animation: "fadeIn 0.3s ease-out",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    });

    // Toggle iframe visibility on button click
    const self = this;
    this.button.addEventListener("click", function() {
      if (self.iframe.style.display === "none") {
        self.iframe.style.display = "block";
      } else {
        self.iframe.style.display = "none";
      }
    });

    // Append elements to the DOM
    document.body.appendChild(this.button);
    document.body.appendChild(this.iframe);

    console.log('ChatBotWidget: Widget created successfully');
  },

  setupRouteChangeListeners: function() {
    const self = this;

    // Listen for popstate (browser back/forward buttons)
    window.addEventListener('popstate', function() {
      console.log('ChatBotWidget: Route changed (popstate)');
      setTimeout(function() {
        self.checkAndRender();
      }, 100);
    });

    // Listen for pushState and replaceState (React Router navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
      originalPushState.apply(this, arguments);
      console.log('ChatBotWidget: Route changed (pushState)');
      setTimeout(function() {
        self.checkAndRender();
      }, 100);
    };

    history.replaceState = function() {
      originalReplaceState.apply(this, arguments);
      console.log('ChatBotWidget: Route changed (replaceState)');
      setTimeout(function() {
        self.checkAndRender();
      }, 100);
    };

    // Also listen for hashchange (for hash-based routing)
    window.addEventListener('hashchange', function() {
      console.log('ChatBotWidget: Route changed (hashchange)');
      setTimeout(function() {
        self.checkAndRender();
      }, 100);
    });

    console.log('ChatBotWidget: Route change listeners set up');
  },

  shouldShowOnCurrentPage: function(allowedPages) {
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
      allowedPages: allowedPages
    });

    // Check each allowed page pattern
    for (let i = 0; i < allowedPages.length; i++) {
      const pattern = allowedPages[i];
      if (this.matchesPattern(pattern, currentUrl, currentPath, currentOrigin)) {
        console.log('ChatBotWidget: Page matched pattern:', pattern);
        return true;
      }
    }

    console.log('ChatBotWidget: No pattern matched. Widget will not be shown.');
    return false;
  },

  matchesPattern: function(pattern, currentUrl, currentPath, currentOrigin) {
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

  wildcardMatch: function(pattern, str) {
    // Remove trailing slashes for consistent matching
    const normalizedPattern = pattern.replace(/\/$/, '');
    const normalizedStr = str.replace(/\/$/, '');
    
    // Convert wildcard pattern to regex
    // Escape special regex characters except *
    const escapeRegex = function(s) {
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
  }
};
