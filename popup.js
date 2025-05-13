// TODO:
// - web access
// - quick #actions (summarize, translate, answer, quiz, calc, search, suggest)
// - prompt suggestions
// - add tabs (speak)
// - remove tips

// Variables
let openai_api_key;
let chat_model;
// comp_model removed as we now use chat models for everything
let max_tokens;
let temperature;
let top_p;
let tone;
let format;
let length;
let lang;
let system;
let convo;
let output;
let write;
let stream_mode = false; // Whether to stream responses in real-time
let sent = [];
let isChat = true;
let msg_count = 0;
let index = 0;
let current_tab = "#tab-chat";
//let text = "";

// Function to show an error message when an image fails to load
function showImageError(container, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message || 'Failed to load the image. Please try again.';
  
  // Clear the container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  // Add error message
  container.appendChild(errorDiv);
}

let variables = {
  openai_api_key: "",
  chat_model: "gpt-4o-mini",
  // Removed comp_model as we now use chat models for all functionality
  max_tokens: 512,
  temperature: 0.7,
  top_p: 1,
  // Removed presence and frequence as we no longer use these parameters
  stream_mode: false, // Whether to stream responses in real-time
};

let tips = [
  "TIP: Use the copy button on code blocks to copy code",
  "TIP: Play with the model parameters in the settings menu",
  "TIP: Use Enter to send a message",
  "TIP: For better results, clear the chat when you change subjects",
  "TIP: Use the arrow keys to navigate through your previous messages",
  "TIP: Use @s or @summarize to summarize the current web page",
  "TIP: Use @t or @translate to translate the current web page to English",
  "TIP: Type @h or @help to see all available features and commands",
];

// Set marked options with custom renderer for code blocks
function setupMarkedRenderer() {
  // Create a custom renderer
  const renderer = new marked.Renderer();
  
  // Override the code block renderer to include copy button
  const originalCodeRenderer = renderer.code;
  renderer.code = function(code, language, isEscaped) {
    // Get language class
    const langClass = language ? `language-${language}` : '';
    
    // Store the original code as a data attribute for copying
    const encodedCode = encodeURIComponent(code);
    
    // Create HTML with copy button positioned at the top right
    return `<div class="code-block-container">
              <button class="code-copy-btn" title="Copy to clipboard" aria-label="Copy code to clipboard" data-code="${encodedCode}">
                <i class="far fa-copy"></i>
              </button>
              <pre><code class="hljs ${langClass}">${
                hljs.getLanguage(language)
                  ? hljs.highlight(code, { language: language }).value
                  : hljs.highlight(code, { language: 'plaintext' }).value
              }</code></pre>
            </div>`;
  };
  
  // Set the custom renderer options
  marked.setOptions({
    renderer: renderer,
    langPrefix: "hljs language-", // highlight.js css expects a top-level 'hljs' class.
    pedantic: false,
    gfm: true,
    breaks: true,
    silent: true,
    sanitize: false,
    smartypants: false,
    xhtml: false,
  });
}

// Initialize Variables
function retriveVariables() {
  try {
    // Fix typo in function name for future references (not renaming function to maintain compatibility)
    openai_api_key = localStorage.getItem("openai_api_key") || "";
    chat_model = localStorage.getItem("chat_model") || "gpt-4o-mini";
    // comp_model = localStorage.getItem("comp_model") || 'text-davinci-003';
    
    // Add input validation for numeric values with fallbacks
    const storedMaxTokens = localStorage.getItem("max_tokens");
    max_tokens = storedMaxTokens ? parseInt(storedMaxTokens) : 512;
    if (isNaN(max_tokens) || max_tokens < 0 || max_tokens > 4096) max_tokens = 512;

    const storedTemp = localStorage.getItem("temperature");
    temperature = storedTemp ? Number(storedTemp) : 0.7;
    if (isNaN(temperature) || temperature < 0 || temperature > 2) temperature = 0.7;

    const storedTopP = localStorage.getItem("top_p");
    top_p = storedTopP ? Number(storedTopP) : 1;
    if (isNaN(top_p) || top_p < 0 || top_p > 1) top_p = 1;
    
    // Get streaming mode preference
    const storedStreamMode = localStorage.getItem("stream_mode");
    stream_mode = storedStreamMode ? storedStreamMode === "true" : false;
    
    // Removed frequency and presence penalty parameters
    
    tone = localStorage.getItem("tone") || "neutral";
    format = localStorage.getItem("format") || "paragraph";
    length = localStorage.getItem("length") || "short";
    lang = localStorage.getItem("lang") || "english";
    
    system =
      localStorage.getItem("system") ||
      "You are a helpful assistant. Answer as concisely and as truthfully as possible.";
      
    // Validate JSON structure
    try {
      const storedConvo = localStorage.getItem("convo");
      if (storedConvo && JSON.parse(storedConvo)) {
        convo = storedConvo;
      } else {
        convo = '[{"role": "system", "content": "' + system + '"}]';
      }
    } catch (e) {
      console.error("Error parsing stored conversation, resetting:", e);
      convo = '[{"role": "system", "content": "' + system + '"}]';
    }
    
    try {
      const storedWrite = localStorage.getItem("write");
      if (storedWrite && JSON.parse(storedWrite)) {
        write = storedWrite;
      } else {
        write = '[{"role": "system", "content": "' + system + '"}]';
      }
    } catch (e) {
      console.error("Error parsing stored write data, resetting:", e);
      write = '[{"role": "system", "content": "' + system + '"}]';
    }
    
    output = localStorage.getItem("output") || "";
  } catch (error) {
    console.error("Error retrieving variables:", error);
    // Reset to defaults if retrieval fails
    resetToDefaults();
  }

  try {
    // Safely set form values with error handling
    document.getElementById("api-key").value = openai_api_key || '';
    
    // Safely set model dropdown
    const modelSelect = document.getElementById("chat-model");
    if (modelSelect) {
      // Check if selected model exists in options
      const modelExists = Array.from(modelSelect.options).some(option => option.value === chat_model);
      modelSelect.value = modelExists ? chat_model : modelSelect.options[0].value;
    }
    
    // Safely set numeric values
    document.getElementById("max").value = max_tokens;
    document.getElementById("max-range").value = max_tokens;
    document.getElementById("temp").value = temperature;
    document.getElementById("temp-range").value = temperature * 100;
    document.getElementById("top-p").value = top_p;
    document.getElementById("top-p-range").value = top_p * 100;
    
    // Set streaming mode checkbox
    document.getElementById("stream-mode").checked = stream_mode;
    
    // Safely set radio buttons
    const toneElement = document.getElementById("tone-" + tone);
    if (toneElement) toneElement.checked = true;
    
    const formatElement = document.getElementById("format-" + format);
    if (formatElement) formatElement.checked = true;
    
    const lengthElement = document.getElementById("length-" + length);
    if (lengthElement) lengthElement.checked = true;
    
    const langElement = document.getElementById("lang-" + lang);
    if (langElement) langElement.checked = true;
    
    // Safely set text values
    document.getElementById("system").value = system || '';
    
    // Safely set output using textContent instead of innerHTML for security
    const outputElement = document.querySelector("#output");
    if (outputElement) outputElement.textContent = output || '';
    
    // No need to display image as Draw tab is removed
  } catch (error) {
    console.error("Error setting form values:", error);
  }
}

// Update Variables
const save = document.querySelector("#save");
save.addEventListener("click", updateVariables);

function updateVariables() {
  try {
    // Safely get values and validate
    openai_api_key = document.getElementById("api-key").value || "";
    
    const modelElement = document.getElementById("chat-model");
    chat_model = modelElement ? modelElement.value : "gpt-4o-mini";
    
    // Validate numeric values
    const maxTokensStr = document.getElementById("max").value;
    max_tokens = parseInt(maxTokensStr);
    if (isNaN(max_tokens) || max_tokens < 0 || max_tokens > 4096) max_tokens = 512;
    
    const tempStr = document.getElementById("temp").value;
    temperature = Number(tempStr);
    if (isNaN(temperature) || temperature < 0 || temperature > 2) temperature = 0.7;
    
    const topPStr = document.getElementById("top-p").value;
    top_p = Number(topPStr);
    if (isNaN(top_p) || top_p < 0 || top_p > 1) top_p = 1;
    
    // Get streaming mode preference
    stream_mode = document.getElementById("stream-mode").checked;
    
    const newSystem = document.getElementById("system").value || "";
    if (system !== newSystem) {
      system = newSystem;
      clearMessage();
    }

    // Store validated values
    localStorage.setItem("openai_api_key", openai_api_key);
    localStorage.setItem("chat_model", chat_model);
    localStorage.setItem("max_tokens", max_tokens);
    localStorage.setItem("temperature", temperature);
    localStorage.setItem("top_p", top_p);
    localStorage.setItem("stream_mode", stream_mode);
    localStorage.setItem("system", system);
    
    showChat();
  } catch (error) {
    console.error("Error updating variables:", error);
    showErrorMessage("Failed to save settings. Please try again.");
  }
}

// Dark Mode
const darkModeSwitch = document.querySelector("#dark-mode");
const bodyElement = document.querySelector("body");
const codeTheme = document.querySelector("#theme");

darkModeSwitch.addEventListener("change", (e) => {
  if (e.target.checked) {
    bodyElement.setAttribute("data-theme", "dark");
    codeTheme.setAttribute("href", "./css/harmonic16-dark.min.css");
    localStorage.setItem("theme", "dark");
  } else {
    bodyElement.setAttribute("data-theme", "light");
    codeTheme.setAttribute("href", "./css/harmonic16-light.min.css");
    localStorage.setItem("theme", "light");
  }
});

// Stream Mode Toggle
const streamModeSwitch = document.querySelector("#stream-mode");
streamModeSwitch.addEventListener("change", (e) => {
  stream_mode = e.target.checked;
  localStorage.setItem("stream_mode", stream_mode);
});

function setTheme() {
  if (localStorage.getItem("theme") !== null) {
    theme = localStorage.getItem("theme");
    bodyElement.setAttribute("data-theme", theme);
    darkModeSwitch.checked = theme == "light" ? false : true;
    codeTheme.setAttribute("href", "./css/harmonic16-" + theme + ".min.css");
  }
}

// Load Convo
function loadConvo() {
  try {
    // Parse conversation JSON into an object
    let convo_obj = JSON.parse(convo);
    
    // Debug log to help diagnose issues
    console.log("Loading conversation:", convo_obj);
    
    // Only display messages, not system prompts
    for (let i = 0; i < convo_obj.length; i++) {
      // Skip system messages as these are not shown to users
      if (convo_obj[i].role === "system") continue;
      
      let text = convo_obj[i].content;
      let type = convo_obj[i].role === "assistant" ? "completion" : "prompt";
      writeToChat(text, type);
    }
  } catch (error) {
    console.error("Error loading conversation:", error);
    // Reset conversation if there's an error
    convo = '[{"role": "system", "content": "' + system + '"}]';
    localStorage.setItem("convo", convo);
  }
}

// Messenger Functions
const send = document.querySelector("#send");
const ask = document.querySelector("#ask");
ask.addEventListener("keyup", function (e) {
  if (e.keyCode == 13) sendMessage();
});
send.addEventListener("click", function () {
  sendMessage();
});
// ask.addEventListener('keyup', function(e){ if(e.keyCode == 13) checkAction(ask.value) });
// send.addEventListener('click', checkAction(ask.value));
ask.addEventListener("keyup", (event) => {
  if (index > -1) {
    if (event.keyCode === 38) {
      // up arrow key
      index--;
      if (index < 0) {
        index = 0;
        ask.value = "";
      }
      ask.value = sent[index];
    } else if (event.keyCode === 40) {
      // down arrow key
      index++;
      if (index >= sent.length) {
        index = sent.length - 1;
        ask.value = "";
      } else {
        ask.value = sent[index];
      }
    }
  }
});

function checkAction(text) {
  if (text.trim().startsWith("@")) {
    console.log(text);
    const match = text.trim().match(/@(\S+)/);
    console.log(match);
    if (match) {
      quickAction(match[0]);
    } else {
      sendMessage();
    }
  }
}

function quickAction(action) {
  switch (action) {
    case "@help":
    case "@h":
      showHelp();
      break;
    case "@summarize":
    case "@s":
      summarizeCurrentPage();
      break;
    case "@translate":
    case "@t":
      translateCurrentPage();
      break;
    default:
      sendMessage();
  }
}

/**
 * Displays a comprehensive help message showing all available commands and functions
 */
function showHelp() {
  const helpText = `
## Sapio Commands

### Available Page Commands
- **@h** or **@help**: Show this help message
- **@s** or **@summarize**: Summarize the current web page content
- **@t** or **@translate**: Translate the current web page to English

### Chat Features
- Start a new conversation with the **Clear** button (🗑️)
- Navigate through previous messages with ↑ and ↓ arrow keys
- Copy code blocks with the provided copy button
- Switch between Chat and Write modes using the tabs

### Settings
- Change the model (default: gpt-4o-mini)
- Adjust temperature to control creativity
- Set the max token length for responses
- Toggle streaming mode for real-time responses

### Write Mode
- Create content with different tones, formats, and lengths
- Support for multiple languages
- Customizable length (short, medium, long)
- Copy the result with the copy button

### Tips
- For better results, clear the chat when changing topics
- Use a more powerful model for complex tasks
- Higher temperature (>0.7) increases creativity
- Lower temperature (<0.7) improves factual accuracy
`;

  // Display user prompt and response
  writeToChat(ask.value, "prompt");
  ask.value = "";

  // Add the response to chat display
  const responseMessage = writeToChat(helpText, "completion");

  // Add this interaction to conversation history
  try {
    // Add user message to history
    addPromptToHistory(ask.value || "@help");

    // Add assistant response to history
    addCompletionToHistory(helpText);
  } catch (e) {
    console.error("Error saving help command to history:", e);
  }
}

/**
 * Summarizes the current page by extracting the content and sending it to the OpenAI API
 */
function summarizeCurrentPage() {
  // Store the original command for history
  const userCommand = ask.value || "@summarize";

  // Display user prompt and loading indicator
  writeToChat(userCommand, "prompt");
  ask.value = "";
  const loadingMsg = writeToChat('<div aria-busy="true"></div>', "completion loading");

  // Add the command to history
  addPromptToHistory(userCommand);

  // Simple timeout in case the background script doesn't respond
  const timeoutId = setTimeout(() => {
    if (loadingMsg && loadingMsg.parentNode) {
      loadingMsg.remove();
    }
    const errorMessage = "Error: Summarization timed out. Please try again.";
    writeToChat(errorMessage, "completion error");
    // Add the error to history
    addCompletionToHistory(errorMessage);
  }, 30000); // 30 second timeout

  // Get page content
  chrome.runtime.sendMessage({ action: "getPageContent" }, (response) => {
    clearTimeout(timeoutId);

    // Handle Chrome runtime errors
    if (chrome.runtime.lastError) {
      console.error("Chrome runtime error:", chrome.runtime.lastError);
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      const errorMessage = "Error: Could not connect to background script. " + chrome.runtime.lastError.message;
      writeToChat(errorMessage, "completion error");
      addCompletionToHistory(errorMessage);
      return;
    }

    // Handle response errors
    if (!response || response.error) {
      console.error("Error getting page content:", response?.error || "No response received");
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      const errorMessage = "Error: Could not access page content. " + (response?.error || "Please try again.");
      writeToChat(errorMessage, "completion error");
      addCompletionToHistory(errorMessage);
      return;
    }

    try {
      // Extract page content
      const { pageTitle, pageContent } = response.pageContent;

      if (!pageContent || pageContent.trim() === "") {
        if (loadingMsg && loadingMsg.parentNode) {
          loadingMsg.remove();
        }
        const errorMessage = "Error: No content found on this page to summarize.";
        writeToChat(errorMessage, "completion error");
        addCompletionToHistory(errorMessage);
        return;
      }

      console.log("Got page content, length:", pageContent.length);

      // Detect if this is a YouTube transcript
      const isYouTubeTranscript =
        pageTitle.includes("YouTube") ||
        pageContent.includes("Video Title:") &&
        (pageContent.includes("Transcript:") || pageContent.includes("Note: Transcript was not available"));

      // Create a summarization prompt
      const userPrompt = `summarize:
Title: ${pageTitle}

Content:
${pageContent}`;

      // Create different system prompts based on content type
      let systemPrompt = "";

      if (isYouTubeTranscript) {
        systemPrompt = "You are a helpful assistant that creates concise and accurate summaries of YouTube videos based on their transcripts. Focus on the main topics, key points, and conclusions from the video. Organize your summary in a clear, structured way with bullet points for key takeaways. Include any important timestamps or segments if mentioned in the transcript. If no transcript was available and only metadata was provided, create a summary based on the video title and description.";
      } else {
        systemPrompt = "You are a helpful assistant that creates concise and accurate summaries of web pages. Focus on extracting key information and main points. Organize your summary in a clear, structured way with bullet points for key takeaways when appropriate.";
      }

      // Create a conversation for the summary
      const summaryConvo = [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ];

      // Send request to OpenAI
      sendChatRequest(summaryConvo, false, loadingMsg);

    } catch (e) {
      console.error("Error processing page content for summary:", e);
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      const errorMessage = "Error: Failed to generate summary. " + e.message;
      writeToChat(errorMessage, "completion error");
      addCompletionToHistory(errorMessage);
    }
  });
}

/**
 * Translates the current page to English
 */
function translateCurrentPage() {
  // Store the original command for history
  const userCommand = ask.value || "@translate";

  // Display user prompt and loading indicator
  writeToChat(userCommand, "prompt");
  ask.value = "";
  const loadingMsg = writeToChat('<div aria-busy="true"></div>', "completion loading");

  // Add the command to history
  addPromptToHistory(userCommand);

  // Simple timeout in case the background script doesn't respond
  const timeoutId = setTimeout(() => {
    if (loadingMsg && loadingMsg.parentNode) {
      loadingMsg.remove();
    }
    const errorMessage = "Error: Translation timed out. Please try again.";
    writeToChat(errorMessage, "completion error");
    // Add the error to history
    addCompletionToHistory(errorMessage);
  }, 30000); // 30 second timeout

  // Get page content
  chrome.runtime.sendMessage({ action: "getPageContent" }, (response) => {
    clearTimeout(timeoutId);

    // Handle Chrome runtime errors
    if (chrome.runtime.lastError) {
      console.error("Chrome runtime error:", chrome.runtime.lastError);
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      const errorMessage = "Error: Could not connect to background script. " + chrome.runtime.lastError.message;
      writeToChat(errorMessage, "completion error");
      addCompletionToHistory(errorMessage);
      return;
    }

    // Handle response errors
    if (!response || response.error) {
      console.error("Error getting page content:", response?.error || "No response received");
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      const errorMessage = "Error: Could not access page content. " + (response?.error || "Please try again.");
      writeToChat(errorMessage, "completion error");
      addCompletionToHistory(errorMessage);
      return;
    }

    try {
      // Extract page content
      const { pageTitle, pageContent } = response.pageContent;

      if (!pageContent || pageContent.trim() === "") {
        if (loadingMsg && loadingMsg.parentNode) {
          loadingMsg.remove();
        }
        const errorMessage = "Error: No content found on this page to translate.";
        writeToChat(errorMessage, "completion error");
        addCompletionToHistory(errorMessage);
        return;
      }

      console.log("Got page content for translation, length:", pageContent.length);

      // Create a translation prompt
      const userPrompt = `translate to English:
Title: ${pageTitle}

Content:
${pageContent}`;

      // Create a conversation for the translation
      const translationConvo = [
        {
          role: "system",
          content: "You are a skilled translator who translates content to fluent, natural English. Maintain the original formatting and structure of the content. If the content is already in English, mention that and provide the content with any minor grammar or expression improvements."
        },
        {
          role: "user",
          content: userPrompt
        }
      ];

      // Send request to OpenAI
      sendChatRequest(translationConvo, false, loadingMsg);

    } catch (e) {
      console.error("Error processing page content for translation:", e);
      if (loadingMsg && loadingMsg.parentNode) {
        loadingMsg.remove();
      }
      const errorMessage = "Error: Failed to translate page. " + e.message;
      writeToChat(errorMessage, "completion error");
      addCompletionToHistory(errorMessage);
    }
  });
}

function checkKey() {
  if (
    openai_api_key === undefined ||
    openai_api_key == "" ||
    openai_api_key.length != 51 ||
    openai_api_key.substring(0, 3) != "sk-"
  ) {
    let text =
      'Please, enter a valid OpenAI API key in the settings menu. You can get one <a href="https://beta.openai.com/" target="_blank">here</a>.';
    writeToChat(text, "completion");
    return false;
  } else {
    return true;
  }
}

function sendMessage() {
  if (checkKey()) {
    let msg = DOMPurify.sanitize(ask.value);
    if (ask.value != "") {
      // Check if this is a command
      if (msg.trim().startsWith('@')) {
        const command = msg.trim().split(' ')[0].toLowerCase();
        // Handle special commands
        if (command === '@summarize' || command === '@s') {
          summarizeCurrentPage();
          return;
        } else if (command === '@translate' || command === '@t') {
          translateCurrentPage();
          return;
        } else if (command === '@help' || command === '@h') {
          showHelp();
          return;
        } else {
          checkAction(command);
        }
        return;
      }
      
      // clear input
      ask.value = "";

      if (current_tab == "#tab-write") {
        // For write mode, we handle prompt differently
        const processedPrompt = writePrompt(msg);
        writeToWrite("...");

        // Send request with the processed write data
        try {
          const writeData = JSON.parse(write);
          // Use chat completion API directly with our prepared messages array
          sendChatRequest(writeData);
        } catch (e) {
          console.error("Error parsing write data:", e);
          writeToWrite("Error processing your request. Please try again.");
        }
      } else {
        // Normal chat mode
        let text = ' <div aria-busy="true"></div> ';
        showChat();
        writeToChat(msg, "prompt");
        writeToChat(text, "completion loading");

        try {
          // First update the conversation object with the new message
          let convoData = JSON.parse(convo);
          
          // Add user message to conversation
          convoData.push({ role: "user", content: msg });
          
          // Update the stored conversation
          convo = JSON.stringify(convoData);
          localStorage.setItem("convo", convo);
          
          console.log("Sending updated conversation:", convoData);
          
          // Now send the updated conversation to OpenAI
          sendChatRequest(convoData);
        } catch (e) {
          console.error("Error updating conversation:", e);
          // If there's an error, reset conversation and try again
          convo = '[{"role": "system", "content": "' + system + '"}]';
          let convoData = JSON.parse(convo);
          convoData.push({ role: "user", content: msg });
          convo = JSON.stringify(convoData);
          localStorage.setItem("convo", convo);
          sendChatRequest(convoData);
        }
      }
    }
  }
}

// const messages = document.querySelector('.chat-tab');
const tabs = document.getElementById("tabs");
const messages = document.querySelector("#tab-chat");
const clear = document.querySelector("#clear");
clear.addEventListener("click", clearMessage);

function clearMessage() {
  sent = [];

  if (current_tab == "#tab-write") {
    write = '[{"role": "system", "content": "' + system + '"}]';
    localStorage.setItem("write", write);
    output = "";
    document.querySelector("#output").innerHTML = output;
    localStorage.setItem("output", output);
  } else {
    showChat();
    convo = '[{"role": "system", "content": "' + system + '"}]';
    localStorage.setItem("convo", convo);
    messages.innerHTML = "";
    let randomTip = tips[Math.floor(Math.random() * tips.length)];
    writeToChat(randomTip, "completion");
    msg_count = 0;
    matches = Array.from(document.querySelectorAll("[id^=msg-]"));
    matches.forEach(function (match) {
      match.removeEventListener("click", copyToClipboard);
    });
  }
}

// Chain DOM Elements Helper Function
let chain = function (target) {
  return {
    createElement: function (name, ids, classes, value) {
      var el = document.createElement(name);
      if (ids !== undefined && ids !== "") {
        el.setAttribute("id", ids);
      }
      if (classes !== undefined && classes !== "") {
        //el.classList.add(classes);
        el.setAttribute("class", classes);
      }
      if (value !== undefined) {
        el.innerHTML = value;
      } else {
        el.innerHTML = "";
      }
      target.appendChild(el);
      return chain(el);
    },
  };
};

// Chat Functions
// Helper function to add error messaging
function showErrorMessage(message) {
  writeToChat(message, "completion error");
}

// Define missing resetToDefaults function
function resetToDefaults() {
  openai_api_key = "";
  chat_model = "gpt-4o-mini";
  max_tokens = 512;
  temperature = 0.7;
  top_p = 1;
  stream_mode = false;
  tone = "neutral";
  format = "paragraph";
  length = "short";
  lang = "english";
  system = "You are a helpful assistant. Answer as concisely and as truthfully as possible.";
  convo = '[{"role": "system", "content": "' + system + '"}]';
  write = '[{"role": "system", "content": "' + system + '"}]';
  output = "";
}

function writeToChat(text, type) {
  try {
    // console.log(text);
    let raw = text;
    
    // First sanitize the text with DOMPurify
    const sanitizedText = DOMPurify.sanitize(text);
    
    // Then parse the sanitized text as markdown
    const markedText = marked.parse(sanitizedText);
    
    // Sanitize again after markdown parsing to catch any issues
    const finalText = DOMPurify.sanitize(markedText, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'i', 'button', 'div'],
      ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'aria-label', 'title', 'style', 'data-code']
    });
    
    let message;
    if (type == "edit") {
      message = document.querySelector(".loading");
      if (!message) {
        console.error("No loading message found to edit");
        return;
      }
      message.classList.remove("loading");
      
      // Use a safe method to set HTML content
      const messageContent = document.createElement('div');
      messageContent.innerHTML = finalText;
      
      // Clear existing content and append the new content
      message.innerHTML = '';
      message.appendChild(messageContent);
    } else {
      ++msg_count;
      message = document.createElement("div");
      message.classList.add("message-line");
      
      // Create elements with DOM methods instead of innerHTML
      const messageDiv = document.createElement('div');
      messageDiv.id = "msg-" + msg_count;
      messageDiv.className = "message " + type;
      
      // Add specific loading class for loading messages to make them easier to find
      if (type === "completion loading") {
        messageDiv.classList.add("loading");
      }
      
      const messagePara = document.createElement('p');
      if (type == "prompt") {
        messagePara.textContent = raw; // Use textContent for user messages
      } else {
        // Use a document fragment to safely add HTML content
        const fragment = document.createDocumentFragment();
        const temp = document.createElement('div');
        temp.innerHTML = finalText;
        
        // Move each child to the fragment
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
        
        messagePara.appendChild(fragment);
      }
      
      messageDiv.appendChild(messagePara);
      message.appendChild(messageDiv);
    }
    
    if (type == "prompt") {
      sent.push(raw); // Store raw text without HTML tags
      index = sent.length;
    }
    
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    
    // Set up copy buttons for code blocks
    setupCodeButtonHandlers();
    
    // Return the message element so it can be referenced later
    return message;
  } catch (error) {
    console.error("Error in writeToChat:", error);
    // Create a simple error message as fallback
    const errorMsg = document.createElement("div");
    errorMsg.classList.add("message-line");
    const errorContent = document.createElement("div");
    errorContent.className = "message error";
    errorContent.textContent = "Error displaying message. Please try again.";
    errorMsg.appendChild(errorContent);
    messages.appendChild(errorMsg);
    return errorMsg;
  }
}

// Write Function
function writeToWrite(text) {
  try {
    // Sanitize text before setting
    const sanitizedText = DOMPurify.sanitize(text);
    const outputElement = document.querySelector("#output");
    if (outputElement) {
      outputElement.textContent = sanitizedText;
      // Store in localStorage
      localStorage.setItem("output", sanitizedText);
    } else {
      console.error("Output element not found");
    }
  } catch (error) {
    console.error("Error in writeToWrite:", error);
  }
}

// Draw functionality has been removed

// Settings Functions
const cancel = document.querySelector("#cancel");
cancel.addEventListener("click", showChat);

// Change active tab
const tabLinks = document.querySelectorAll("nav a");
const tabContent = document.querySelectorAll(".tab");

tabLinks.forEach(function (link) {
  link.addEventListener("click", function (e) {
    e.preventDefault();

    tabLinks.forEach(function (tab) {
      tab.classList.remove("active");
    });

    this.classList.add("active");
    current_tab = this.getAttribute("href");
    //console.log(current_tab);

    if (current_tab == "#tab-write") {
      document.getElementById("ask").placeholder = "Write about...";
    } else if (current_tab == "#tab-speak") {
      document.getElementById("ask").placeholder = "Speak about...";
    } else {
      document.getElementById("ask").placeholder = "Ask something...";
    }

    tabContent.forEach(function (content) {
      content.classList.remove("active");
    });

    const target = this.getAttribute("href");
    document.querySelector(target).classList.add("active");

    messages.scrollTop = messages.scrollHeight;
  });
});

function showChat() {
  tabLinks.forEach(function (tab) {
    tab.classList.remove("active");
  });

  // Add the 'active' class to the first tab link
  tabLinks[0].classList.add("active");
  current_tab = tabLinks[0].getAttribute("href");
  // Hide all tab content
  tabContent.forEach(function (content) {
    content.classList.remove("active");
  });

  // Show the first tab content
  const target = tabLinks[0].getAttribute("href");
  document.querySelector(target).classList.add("active");
  messages.scrollTop = messages.scrollHeight;
}

// Slider
function slider(id, id_range, factor = 1) {
  const id_slider = document.getElementById(id_range);
  const id_val = document.getElementById(id);
  id_val.value = id_slider.value / factor;

  id_slider.oninput = function () {
    id_val.value = this.value / factor;
  };
  id_val.oninput = function () {
    id_slider.value = this.value * factor;
  };
}

// Copy button
const copy = document.querySelector(".copy");
copy.addEventListener("click", copyToClipboard);

function copyToClipboard() {
  navigator.clipboard.writeText(output);
}

// No longer adding click listeners to messages for copying
function addListenerOnMessageClick(id) {
  // Function kept for compatibility but functionality removed
}

// Update convo
/**
 * Adds a user prompt to the conversation history
 * @param {string} prompt - The user's prompt to add to history
 */
function addPromptToHistory(prompt) {
  try {
    // Sanitize prompt
    const sanitizedPrompt = DOMPurify.sanitize(prompt);

    if (current_tab == "#tab-write") {
      // For write mode, we now handle this in writePrompt function
      // This branch should no longer be needed, but kept for backwards compatibility
      console.warn("Unexpected call to addPromptToHistory in write mode - this should be handled by writePrompt");
    } else {
      try {
        // Parse existing conversation
        const convoData = JSON.parse(convo);

        // Add new message
        convoData.push({ role: "user", content: sanitizedPrompt });

        // Convert back to string
        convo = JSON.stringify(convoData);

        // Store in localStorage
        localStorage.setItem("convo", convo);

        console.log("Added user prompt to history:", sanitizedPrompt.substring(0, 50) + (sanitizedPrompt.length > 50 ? '...' : ''));
      } catch (e) {
        console.error("Error parsing conversation:", e);
        // Reset conversation if invalid
        const systemMessage = system || "You are a helpful assistant. Answer as concisely and as truthfully as possible.";
        convo = JSON.stringify([
          { role: "system", content: systemMessage },
          { role: "user", content: sanitizedPrompt }
        ]);
        localStorage.setItem("convo", convo);
      }
    }
  } catch (error) {
    console.error("Error in addPromptToHistory:", error);
  }
}

/**
 * Adds an assistant completion to the conversation history
 * @param {string} completion - The assistant's completion to add to history
 */
function addCompletionToHistory(completion) {
  try {
    // Sanitize completion
    const sanitizedCompletion = DOMPurify.sanitize(completion);

    if (current_tab == "#tab-write") {
      localStorage.setItem("output", sanitizedCompletion);
    } else {
      try {
        // Parse existing conversation
        const convoData = JSON.parse(convo);

        // Add assistant response
        convoData.push({ role: "assistant", content: sanitizedCompletion });

        // Convert back to string
        convo = JSON.stringify(convoData);

        // Store in localStorage
        localStorage.setItem("convo", convo);

        console.log("Added assistant completion to history:", sanitizedCompletion.substring(0, 50) + (sanitizedCompletion.length > 50 ? '...' : ''));
      } catch (e) {
        console.error("Error updating conversation with completion:", e);
        // Reset if invalid
        const systemMessage = system || "You are a helpful assistant. Answer as concisely and as truthfully as possible.";
        convo = JSON.stringify([
          { role: "system", content: systemMessage }
        ]);
        localStorage.setItem("convo", convo);
      }
    }
  } catch (error) {
    console.error("Error in addCompletionToHistory:", error);
  }
}

// Legacy functions for backward compatibility
function addPrompt(prompt) {
  addPromptToHistory(prompt);
}

function addCompletion(completion) {
  addCompletionToHistory(completion);
}

// Completion settings
function writePrompt(prompt) {
  try {
    // Get radio button values with fallbacks
    const toneElement = document.querySelector('input[name="tone"]:checked');
    tone = toneElement ? toneElement.value : "neutral";
    
    const formatElement = document.querySelector('input[name="format"]:checked');
    format = formatElement ? formatElement.value : "paragraph";
    
    const lengthElement = document.querySelector('input[name="length"]:checked');
    length = lengthElement ? lengthElement.value : "short";
    
    const langElement = document.querySelector('input[name="lang"]:checked');
    lang = langElement ? langElement.value : "english";
    
    // Store safely
    localStorage.setItem("tone", tone);
    localStorage.setItem("format", format);
    localStorage.setItem("length", length);
    localStorage.setItem("lang", lang);
    
    // Instead of returning a prompt string, we modify the write data with system prompt
    // that contains the writing instructions
    const sanitizedPrompt = DOMPurify.sanitize(prompt);
    const systemPrompt = `You are a helpful writing assistant. Write a ${length} length ${format} about the user's topic with a ${tone} tone in ${lang}. Be concise and focused.`;
    
    // Create the write data with the system prompt and user content
    const writeData = [
      { role: "system", content: systemPrompt },
      { role: "user", content: sanitizedPrompt }
    ];
    
    // Store it
    write = JSON.stringify(writeData);
    return sanitizedPrompt; // Return just the sanitized user prompt for display
  } catch (error) {
    console.error("Error in writePrompt:", error);
    const sanitizedPrompt = DOMPurify.sanitize(prompt);
    const fallbackData = [
      { role: "system", content: "You are a helpful writing assistant. Write about the user's topic." },
      { role: "user", content: sanitizedPrompt }
    ];
    write = JSON.stringify(fallbackData);
    return sanitizedPrompt;
  }
}

// Function to add new chat completion helper for write mode
async function sendChatRequest(messagesArray, isOneTimeRequest = false, loadingElement = null) {
  try {
    if (!openai_api_key || !openai_api_key.startsWith("sk-")) {
      // Handle different modes with appropriate error displays
      if (current_tab == "#tab-write") {
        writeToWrite("Please enter a valid API key in the settings.");
      } else {
        writeToChat("Please enter a valid API key in the settings.", "completion error");
      }
      return;
    }

    // Add the most recent user message to conversation history if in chat mode
    // Don't modify messages in chat mode since we already handled the message
    // in the sendMessage() function unless it's a one-time request like @summarize
    if (current_tab !== "#tab-write" && !isOneTimeRequest) {
      console.log("Chat mode - messages array:", messagesArray);
      // We don't need to add the prompt again since it was already added in sendMessage
      // This was causing duplicate messages and breaking the conversation
    }

    // Validate parameters
    const validatedParams = {
      model: chat_model,
      messages: messagesArray,
      max_tokens: Math.max(1, Math.min(4096, max_tokens)),
      temperature: Math.max(0, Math.min(2, temperature)),
      top_p: Math.max(0, Math.min(1, top_p)),
      stream: stream_mode, // Enable streaming if the user has toggled it on
    };
    
    console.log("Sending request to OpenAI:", {
      model: validatedParams.model,
      messageCount: validatedParams.messages.length,
      temperature: validatedParams.temperature,
      stream: validatedParams.stream
    });
    
    // Handle streaming mode differently from regular mode
    if (stream_mode) {
      try {
        // Create variables for streaming response
        let responseElement = null;
        let streamedText = "";
        
        // Different handling based on which tab we're in
        if (current_tab == "#tab-write") {
          // For Write tab, we'll update the output textarea directly
          // First clear the output
          writeToWrite("...");
        } else {
          // For Chat tab, create a streaming message element
          
          // Remove loading message first if we're going to stream in its place
          if (loadingElement) {
            // Use the direct reference if provided
            loadingElement.remove();
          } else {
            // Fallback to more specific selector
            const loadingMsg = document.querySelector(".message.completion.loading");
            if (loadingMsg) {
              loadingMsg.remove();
            }
          }
          
          // Create a new message for streaming response
          responseElement = writeToChat("", "completion streaming");
        }
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + openai_api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validatedParams),
        });

        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error:", errorData);
          
          let errorMessage = "An error occurred while processing your request.";
          if (response.status === 401) {
            errorMessage = "Invalid API key. Please check your settings.";
          } else if (response.status === 429) {
            errorMessage = "Rate limit exceeded. Please try again later.";
          } else if (errorData.error?.message) {
            errorMessage = `Error: ${errorData.error.message}`;
          }
          
          // Remove streaming element if it exists
          if (responseElement) {
            responseElement.remove();
          }
          writeToChat(errorMessage, "completion error");
          return;
        }

        // Process streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        
        let fullResponse = "";
        
        // Function to process each chunk of the stream
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });
          
          try {
            // Process each line of the chunk (may contain multiple data events)
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue; // Skip empty lines
              
              // Each data line starts with "data: "
              if (!line.startsWith('data: ')) continue;
              
              // Check for the stream end marker
              if (line === 'data: [DONE]') continue;
              
              // Parse the JSON data
              const json = JSON.parse(line.substring(6));
              
              // Check for content delta
              if (json.choices && json.choices[0]?.delta?.content) {
                const contentChunk = json.choices[0].delta.content;
                fullResponse += contentChunk;
                
                // Add the content chunk to the full response
                streamedText += contentChunk;

                if (current_tab == "#tab-write") {
                  // For Write tab, update the output textarea directly
                  const outputElement = document.getElementById("output");
                  if (outputElement) {
                    // Just update with the raw text - no markdown parsing needed for Write mode
                    outputElement.textContent = streamedText;
                  }
                } else if (responseElement) {
                  // For Chat mode, update the streaming message with markdown parsing
                  
                  // Use DOMPurify and marked to render markdown as it streams
                  const sanitizedText = DOMPurify.sanitize(streamedText);
                  const markedText = marked.parse(sanitizedText);
                  const finalText = DOMPurify.sanitize(markedText, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'i', 'button', 'div'],
                    ALLOWED_ATTR: ['href', 'target', 'class', 'id', 'aria-label', 'title', 'style', 'data-code']
                  });
                  
                  // Update the message content
                  const messageContent = responseElement.querySelector(".message.streaming p");
                  if (messageContent) {
                    messageContent.innerHTML = finalText;
                    
                    // Set up any copy buttons in code blocks that might have been added
                    setupCodeButtonHandlers();
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error processing stream chunk:", e);
          }
        }
        
        // Stream is done, finalize the response
        if (current_tab == "#tab-write") {
          // In write mode, save the output to localStorage
          localStorage.setItem("output", DOMPurify.sanitize(fullResponse));
        } else if (!isOneTimeRequest) {
          // In chat mode, add to conversation history if it's not a one-time request
          addCompletion(fullResponse);
          
          // Change streaming class to regular completion class
          if (responseElement) {
            const messageDiv = responseElement.querySelector(".message.streaming");
            if (messageDiv) {
              messageDiv.classList.remove("streaming");
            }
          }
        }
        
        return fullResponse;
      } catch (error) {
        console.error("Streaming error:", error);
        
        // Handle errors appropriately for each tab
        if (current_tab == "#tab-write") {
          writeToWrite("Network error. Please check your connection and try again.");
        } else {
          // Remove loading or streaming indicators
          if (loadingElement) {
            loadingElement.remove();
          } else {
            // Check for both types of indicators
            const indicators = document.querySelectorAll(".message.completion.loading, .message.completion.streaming");
            indicators.forEach(indicator => indicator.remove());
          }
          writeToChat("Network error. Please check your connection and try again.", "completion error");
        }
      }
    } else {
      // Non-streaming mode (original behavior)
      try {
        // Set stream to false for non-streaming requests
        validatedParams.stream = false;
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + openai_api_key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(validatedParams),
        });

        // Check if response is ok
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error:", errorData);
          
          let errorMessage = "An error occurred while processing your request.";
          if (response.status === 401) {
            errorMessage = "Invalid API key. Please check your settings.";
          } else if (response.status === 429) {
            errorMessage = "Rate limit exceeded. Please try again later.";
          } else if (errorData.error?.message) {
            errorMessage = `Error: ${errorData.error.message}`;
          }
          
          if (current_tab == "#tab-write") {
            writeToWrite(errorMessage);
          } else {
            // Remove loading indicator
            if (loadingElement) {
              // Use the direct reference if provided
              loadingElement.remove();
            } else {
              // Fallback to more specific selector that matches the actual class structure
              const loadingMsg = document.querySelector(".message.completion.loading");
              if (loadingMsg) {
                loadingMsg.remove();
              }
            }
            writeToChat(errorMessage, "completion error");
          }
          return;
        }

        const data = await response.json();
        
        // Validate response structure
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error("Invalid API response:", data);
          
          if (current_tab == "#tab-write") {
            writeToWrite("Received an invalid response. Please try again.");
          } else {
            // Remove loading indicator
            if (loadingElement) {
              // Use the direct reference if provided
              loadingElement.remove();
            } else {
              // Fallback to more specific selector that matches the actual class structure
              const loadingMsg = document.querySelector(".message.completion.loading");
              if (loadingMsg) {
                loadingMsg.remove();
              }
            }
            writeToChat("Received an invalid response. Please try again.", "completion error");
          }
          return;
        }
        
        // Get response content
        const answer = data.choices[0].message.content;

        // Handle different modes
        if (current_tab == "#tab-write") {
          writeToWrite(answer);
          localStorage.setItem("output", DOMPurify.sanitize(answer));
        } else {
          // Remove loading message first
          if (loadingElement) {
            // Use the direct reference if provided
            loadingElement.remove();
          } else {
            // Fallback to more specific selector that matches the actual class structure
            const loadingMsg = document.querySelector(".message.completion.loading");
            if (loadingMsg) {
              loadingMsg.remove();
            }
          }

          // Only add to conversation history if it's not a one-time request
          if (!isOneTimeRequest) {
            addCompletion(answer);
          }

          // Display the message as a new message, not editing an existing one
          writeToChat(answer, "completion");
        }
        
        return answer;
      } catch (error) {
        console.error("Network error:", error);
        
        if (current_tab == "#tab-write") {
          writeToWrite("Network error. Please check your connection and try again.");
        } else {
          // Remove loading indicator
          if (loadingElement) {
            loadingElement.remove();
          } else {
            const loadingMsg = document.querySelector(".message.completion.loading");
            if (loadingMsg) {
              loadingMsg.remove();
            }
          }
          writeToChat("Network error. Please check your connection and try again.", "completion error");
        }
      }
    }
  } catch (error) {
    console.error("Error in sendChatRequest:", error);

    if (current_tab == "#tab-write") {
      writeToWrite("An unexpected error occurred. Please try again.");
    } else {
      // Remove loading indicator
      if (loadingElement) {
        loadingElement.remove();
      } else {
        // Check for both loading and streaming indicators
        const indicators = document.querySelectorAll(".message.completion.loading, .message.completion.streaming");
        indicators.forEach(indicator => indicator.remove());
      }
      writeToChat("An unexpected error occurred. Please try again.", "completion error");
    }
  }
}

// Handle copy buttons
function setupCodeButtonHandlers() {
  try {
    // Find all copy buttons
    const copyButtons = document.querySelectorAll('.code-copy-btn');
    
    copyButtons.forEach((button) => {
      // Only add event listener if it doesn't have one already
      if (!button.hasAttribute('data-listener')) {
        button.setAttribute('data-listener', 'true');
        
        button.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          // Get the code content from the data attribute or find it in the DOM
          let codeText = '';
          if (this.hasAttribute('data-code')) {
            // Get the code from the data attribute (already stored the raw code)
            codeText = decodeURIComponent(this.getAttribute('data-code') || '');
          } else {
            // Find the code element within the container
            const container = this.closest('.code-block-container');
            if (container) {
              const codeElement = container.querySelector('code');
              if (codeElement) {
                codeText = codeElement.textContent || '';
              }
            }
          }
          
          if (!codeText) {
            console.error('No code found to copy');
            return;
          }
          
          // Copy to clipboard
          navigator.clipboard.writeText(codeText)
            .then(() => {
              // Show success feedback
              this.classList.add('copied');
              this.innerHTML = '<i class="fas fa-check"></i>';
              
              // Reset after 2 seconds
              setTimeout(() => {
                this.classList.remove('copied');
                this.innerHTML = '<i class="far fa-copy"></i>';
              }, 2000);
            })
            .catch((err) => {
              console.error('Copy failed:', err);
              this.innerHTML = '<i class="fas fa-times"></i>';
              setTimeout(() => {
                this.innerHTML = '<i class="far fa-copy"></i>';
              }, 2000);
            });
        });
      }
    });
  } catch (error) {
    console.error('Error setting up code button handlers:', error);
  }
}

// Observe DOM changes to handle code block copy buttons
function setupCodeBlockObserver() {
  try {
    // Create a mutation observer to watch for copy buttons
    const observer = new MutationObserver((mutations) => {
      let handlersNeeded = false;
      
      // Check if we need to add handlers for new buttons
      for (const mutation of mutations) {
        if (mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && 
                (node.classList?.contains('code-copy-btn') || 
                 node.querySelector?.('.code-copy-btn'))) {
              handlersNeeded = true;
              break;
            }
          }
          if (handlersNeeded) break;
        }
      }
      
      if (handlersNeeded) {
        setupCodeButtonHandlers();
      }
    });
    
    // Start observing the chat container
    observer.observe(document.querySelector('#tab-chat'), {
      childList: true,
      subtree: true
    });
  } catch (error) {
    console.error('Error setting up code block observer:', error);
  }
}

window.addEventListener("load", function () {
  console.log("Window loaded - initializing extension");
  // Set up custom renderer for marked
  setupMarkedRenderer();
  
  // Initialize user variables
  retriveVariables();
  setTheme();
  
  // Show welcome tip
  let randomTip = tips[Math.floor(Math.random() * tips.length)];
  writeToChat(randomTip, "completion");
  loadConvo();
  
  // Initiate Sliders
  slider("max", "max-range");
  slider("temp", "temp-range", 100);
  slider("top-p", "top-p-range", 100);
  
  // Set up code block copy buttons
  setupCodeButtonHandlers();
  setupCodeBlockObserver();
  
  // Set focus to chat
  showChat();
  document.querySelector("#ask").focus();
});