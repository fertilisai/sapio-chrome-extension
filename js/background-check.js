// Utility to verify background script is loaded and responsive
// Function to check if critical functions exist
window.checkCriticalFunctions = function() {
  const critical = [
    { name: 'sendMessage', exists: typeof window.sendMessage === 'function' },
    { name: 'originalSendMessage', exists: typeof window.originalSendMessage === 'function' },
    { name: 'writeToChat', exists: typeof window.writeToChat === 'function' },
    { name: 'checkKey', exists: typeof window.checkKey === 'function' },
    { name: 'sendChatRequest', exists: typeof window.sendChatRequest === 'function' },
    { name: 'summarizeCurrentPage', exists: typeof window.summarizeCurrentPage === 'function' }
  ];

  console.log('Critical function status:', critical);
  return critical;
};

// Global test function to check background connection
window.testBackgroundConnection = async function() {
  return new Promise((resolve, reject) => {
    console.log("Testing background connection...");

    // Set timeout to catch non-responsive background
    const timeoutId = setTimeout(() => {
      console.error("Background connection test timeout");
      reject(new Error("Background connection timeout"));
    }, 5000); // 5 second timeout

    try {
      // Send a ping to the background script
      chrome.runtime.sendMessage({ action: "ping" }, (response) => {
        clearTimeout(timeoutId);

        // Check for runtime error
        if (chrome.runtime.lastError) {
          console.error("Background check failed:", chrome.runtime.lastError);
          reject(new Error(`Background connection error: ${chrome.runtime.lastError.message}`));
          return;
        }

        // Verify we got a valid response
        if (response && response.status === "ok") {
          console.log(`Background connection verified at ${response.timestamp}`);
          resolve(true);
        } else {
          console.error("Background check received invalid response:", response);
          reject(new Error("Background connection invalid response"));
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error("Background check runtime error:", error);
      reject(error);
    }
  });
};

class BackgroundConnection {
  // Check if the background script is responsive with a timeout
  static async checkConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      // Set a timeout to catch non-responsive background
      const timeoutId = setTimeout(() => {
        reject(new Error("Background connection timeout"));
      }, timeout);
      
      try {
        // Send a ping to the background script
        chrome.runtime.sendMessage({ action: "ping" }, (response) => {
          clearTimeout(timeoutId);
          
          // Check for runtime error
          if (chrome.runtime.lastError) {
            console.error("Background check failed:", chrome.runtime.lastError);
            reject(new Error(`Background connection error: ${chrome.runtime.lastError.message}`));
            return;
          }
          
          // Verify we got a valid response
          if (response && response.status === "ok") {
            console.log(`Background connection verified at ${response.timestamp}`);
            resolve(true);
          } else {
            console.error("Background check received invalid response:", response);
            reject(new Error("Background connection invalid response"));
          }
        });
      } catch (error) {
        clearTimeout(timeoutId);
        console.error("Background check runtime error:", error);
        reject(error);
      }
    });
  }
  
  // Send a message to the background with retry and verification
  static async sendMessage(message, maxRetries = 2) {
    // First verify connection
    try {
      await this.checkConnection();
    } catch (error) {
      console.error("Connection check failed before sending message:", error);
      throw error;
    }
    
    return new Promise((resolve, reject) => {
      let retries = 0;
      
      const attemptSend = () => {
        try {
          chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
              console.error(`Send attempt ${retries+1} failed:`, chrome.runtime.lastError);
              
              // Retry if we haven't exceeded max retries
              if (retries < maxRetries) {
                retries++;
                console.log(`Retrying message send, attempt ${retries+1}...`);
                setTimeout(attemptSend, 500); // Wait 500ms before retry
                return;
              }
              
              reject(new Error(`Message send failed after ${retries+1} attempts: ${chrome.runtime.lastError.message}`));
              return;
            }
            
            resolve(response);
          });
        } catch (error) {
          console.error(`Send attempt ${retries+1} exception:`, error);
          
          // Retry if we haven't exceeded max retries
          if (retries < maxRetries) {
            retries++;
            console.log(`Retrying after exception, attempt ${retries+1}...`);
            setTimeout(attemptSend, 500);
            return;
          }
          
          reject(error);
        }
      };
      
      attemptSend();
    });
  }
}