// This script ensures that the chat functionality works correctly
// It adds event listeners for the chat input and send button
// It also exposes the summarizeCurrentPage function globally

// Wait for both document load and a small delay to ensure popup.js has initialized
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure popup.js has fully executed
  setTimeout(() => {
    // Check what functions are available
    window.checkCriticalFunctions();

    // If summarizeCurrentPage exists but isn't global, make it global
    if (typeof summarizeCurrentPage === 'function' && typeof window.summarizeCurrentPage !== 'function') {
      window.summarizeCurrentPage = summarizeCurrentPage;
      console.log("Made summarizeCurrentPage globally accessible");
    }

    // Access other global variables that might be needed
    if (typeof convo !== 'undefined' && !window.convo) {
      window.convo = convo;
    }
  }, 200);
  console.log("Chat fix script loaded");
  
  // Get references to DOM elements
  const sendButton = document.querySelector("#send");
  const askInput = document.querySelector("#ask");
  
  if (!sendButton || !askInput) {
    console.error("Could not find send button or input field");
    return;
  }
  
  // Function to send a message
  function sendMessageToChat() {
    console.log("Sending message:", askInput.value);
    
    // Check if this is a command starting with @
    if (askInput.value.trim().startsWith('@')) {
      const command = askInput.value.trim().split(' ')[0].toLowerCase();
      // Handle both @summarize and @s
      if (command === '@summarize' || command === '@s') {
        console.log("Running summarize command");
        summarizeCurrentPage();
        return;
      }
    }
    
    // For other messages, use the original sendMessage
    if (window.originalSendMessage) {
      window.originalSendMessage();
    } else {
      console.error("Original sendMessage function not found");
      // Fallback basic implementation
      if (window.checkKey && window.checkKey()) {
        const msg = askInput.value;
        if (msg) {
          // Display user message
          window.writeToChat(msg, "prompt");
          askInput.value = "";
          
          // Display loading indicator
          const loadingMsg = window.writeToChat('<div aria-busy="true"></div>', "completion loading");
          
          // If this isn't a command and we have sendChatRequest, use it
          if (window.sendChatRequest && window.convo) {
            try {
              // Update conversation
              let convoData = JSON.parse(window.convo);
              convoData.push({ role: "user", content: msg });
              window.convo = JSON.stringify(convoData);
              localStorage.setItem("convo", window.convo);
              
              // Send request
              window.sendChatRequest(convoData);
            } catch (e) {
              console.error("Error sending chat:", e);
              if (loadingMsg && loadingMsg.parentNode) {
                loadingMsg.remove();
              }
              window.writeToChat("Error sending message. Please try again.", "completion error");
            }
          }
        }
      }
    }
  }
  
  // Set up event listeners
  sendButton.addEventListener("click", function() {
    console.log("Send button clicked");
    sendMessageToChat();
  });
  
  askInput.addEventListener("keyup", function(e) {
    if (e.keyCode === 13) { // Enter key
      console.log("Enter key pressed in input");
      sendMessageToChat();
    }
  });
  
  console.log("Chat event listeners attached successfully");
});