window.ChatBotWidget = {
  init: function (config) {
    // Prevent running inside iframe
    if (window.self !== window.top) return;

    // Prevent duplication
    if (document.getElementById("chatbot-widget-button") || document.getElementById("chatbot-widget-iframe")) return;

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
    const button = document.createElement("button");
    button.id = "chatbot-widget-button";
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="white" viewBox="0 0 24 24">
        <path d="M2 2v20l4-4h14V2H2zm16 10H6v-2h12v2z"/>
      </svg>
    `;
    Object.assign(button.style, {
      position: "fixed",
      bottom: config.position === "bottom-left" ? "20px" : "20px",
      right: config.position === "bottom-left" ? "auto" : "20px",
      left: config.position === "bottom-left" ? "20px" : "auto",
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
    const iframe = document.createElement("iframe");
    iframe.id = "chatbot-widget-iframe";
    iframe.src = `${config.apiUrl}/embed?botId=${config.botId}`;
    Object.assign(iframe.style, {
      position: "fixed",
      bottom: "90px",
      right: "20px",
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
    button.addEventListener("click", () => {
      iframe.style.display = iframe.style.display === "none" ? "block" : "none";
    });

    // Append elements to the DOM
    document.body.appendChild(button);
    document.body.appendChild(iframe);
  },
};
