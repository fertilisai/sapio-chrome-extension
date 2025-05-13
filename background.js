// Simple background script for Sapio extension
console.log("Sapio background script started:", new Date().toISOString());

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log("Background received message:", request);
  
  // Handle ping requests to verify background script is active
  if (request.action === "ping") {
    console.log("Ping received, sending response");
    sendResponse({
      status: "ok",
      message: "Background script is active",
      timestamp: new Date().toISOString()
    });
    return true; // Keep channel open for async response
  }
  
  // Handle page content extraction request
  if (request.action === "getPageContent") {
    console.log("Content extraction requested");
    
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (!tabs || !tabs.length) {
        console.error("No active tab found");
        sendResponse({ error: "No active tab found" });
        return;
      }
      
      var activeTab = tabs[0];
      console.log("Active tab:", activeTab.url);
      
      // Execute a content script to extract the page content
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: extractPageContent
      }).then(function(results) {
        console.log("Content extraction completed");
        if (results && results[0]) {
          sendResponse({
            pageContent: {
              pageTitle: activeTab.title || "",
              pageContent: results[0].result
            }
          });
        } else {
          sendResponse({ error: "Failed to extract content" });
        }
      }).catch(function(error) {
        console.error("Error executing content script:", error);
        sendResponse({ error: error.toString() });
      });
      
      return true; // Keep channel open for async response
    });
    
    return true; // Keep channel open for async response
  }
});

// Function to extract content from the page
function extractPageContent() {
  console.log("Extracting content from page");

  try {
    // Check if this is a YouTube page
    const isYouTube = window.location.hostname.includes('youtube.com') && window.location.pathname.includes('/watch');

    if (isYouTube) {
      console.log("YouTube page detected, trying to extract transcript");
      return extractYouTubeTranscript();
    }

    // Standard extraction for non-YouTube pages
    var mainContent = "";

    // Try to find main content areas
    var contentElements = document.querySelectorAll('article, [role="main"], main, .main-content, #main-content, .content, #content');
    if (contentElements && contentElements.length) {
      for (var i = 0; i < contentElements.length; i++) {
        mainContent += contentElements[i].innerText + "\n\n";
      }
    }

    // If no specific content found, use body
    if (!mainContent.trim()) {
      mainContent = document.body.innerText;
    }

    // Normalize whitespace and limit length
    mainContent = mainContent.replace(/\s+/g, ' ').trim();

    // Limit to approximately 16K characters (about 4K tokens)
    if (mainContent.length > 16000) {
      mainContent = mainContent.substring(0, 16000) + "... (content truncated)";
    }

    return mainContent;
  } catch (error) {
    console.error("Error extracting content:", error);
    return "Error extracting content: " + error.message;
  }
}

function extractYouTubeTranscript() {
  try {
    // Get video title
    const videoTitle = document.querySelector('h1.title.style-scope.ytd-video-primary-info-renderer')?.textContent ||
                      document.querySelector('h1.title')?.textContent ||
                      "YouTube Video";

    // Try several methods to extract YouTube transcript

    // Method 1: Look for transcript in the transcript panel if already open
    let transcriptText = "";
    const transcriptItems = document.querySelectorAll('div.segment-text, ytd-transcript-segment-renderer');
    if (transcriptItems && transcriptItems.length > 0) {
      // Transcript panel is already open, extract text
      transcriptItems.forEach(item => {
        transcriptText += item.textContent.trim() + " ";
      });
    }

    // Method 2: Check for an expanded description which might contain a transcript
    if (!transcriptText.trim()) {
      const expandedDescription = document.querySelector('#description-inline-expander #description')?.textContent ||
                                 document.querySelector('ytd-expanded-shelf-contents-renderer #description')?.textContent;

      if (expandedDescription && expandedDescription.length > 500) {
        // If the description is long, it might contain a transcript
        transcriptText = "Possible transcript from description:\n" + expandedDescription.trim();
      }
    }

    // Method 3: Look for captions in the video player
    if (!transcriptText.trim()) {
      const captionSegments = document.querySelectorAll('.captions-text, .ytp-caption-segment');
      if (captionSegments && captionSegments.length > 0) {
        transcriptText = "Extracted from visible captions:\n";
        captionSegments.forEach(segment => {
          transcriptText += segment.textContent.trim() + " ";
        });
      }
    }

    // If we couldn't get a transcript through automatic means, return metadata
    if (!transcriptText.trim()) {
      // Extract video metadata
      const channelName = document.querySelector('#owner-name a')?.textContent ||
                         document.querySelector('div#owner-text a')?.textContent ||
                         document.querySelector('ytd-channel-name a')?.textContent ||
                         "Unknown Channel";

      const viewCount = document.querySelector('span.view-count')?.textContent ||
                       document.querySelector('#count .view-count')?.textContent ||
                       document.querySelector('span.view-count.style-scope.ytd-video-view-count-renderer')?.textContent ||
                       "Unknown views";

      const description = document.querySelector('#description-inline-expander #description')?.textContent ||
                         document.querySelector('#description-text')?.textContent ||
                         document.querySelector('ytd-expander yt-formatted-string')?.textContent ||
                         "No description available";

      // Look for comments as they might provide context
      let topComments = "";
      const commentTexts = document.querySelectorAll('ytd-comment-renderer #content-text');
      if (commentTexts && commentTexts.length > 0) {
        topComments = "\nTop Comments:\n";
        // Get up to 5 top comments
        for (let i = 0; i < Math.min(5, commentTexts.length); i++) {
          topComments += `- ${commentTexts[i].textContent.trim()}\n`;
        }
      }

      const videoMetadata = `
Video Title: ${videoTitle}
Channel: ${channelName}
Views: ${viewCount}
Description: ${description}
${topComments}

Note: Transcript was not available for this video. This summary is based on video metadata only.
      `;

      return videoMetadata.trim();
    }

    // Format the transcript with video title
    const formattedTranscript = `
Video Title: ${videoTitle}

Transcript:
${transcriptText.trim()}
    `;

    // Limit length if needed
    if (formattedTranscript.length > 16000) {
      return formattedTranscript.substring(0, 16000) + "... (transcript truncated)";
    }

    return formattedTranscript.trim();
  } catch (error) {
    console.error("Error extracting YouTube transcript:", error);
    return `Error extracting YouTube transcript: ${error.message}. This appears to be a YouTube video, but the transcript couldn't be accessed automatically.`;
  }
}

// Log that background script is ready
console.log("Sapio background script ready");