# Changelog

## v0.0.8

### Added or Changed

- Added special handling for YouTube videos when using @summarize (@s)
- Implemented transcript extraction for YouTube videos instead of general page content
- Added multiple methods for extracting YouTube content (transcript panel, captions, description)
- Include video metadata (title, channel, views) when transcript is not available
- Added top comments extraction for YouTube videos to provide additional context
- Special system prompt for more meaningful YouTube video summaries

## v0.0.7

### Added or Changed

- Added @translate command to translate web pages to English
- Added @help command to display available features and commands
- Made command responses (@s, @t, @h) persistent in chat history
- Added streaming support with animated visual feedback
- Improved error handling for all commands with persistent error messages
- Updated tips to include information about new commands
- Added context-aware message history for better conversation flow

## v0.0.6

### Added or Changed

- Changed default model to gpt-4o-mini for better performance
- Increased default max tokens from 256 to 512
- Removed Frequency Penalty and Presence Penalty settings to simplify UI
- Removed Draw tab and all DALL-E image generation functionality
- Added streaming responses for real-time chat interaction
- Added @summarize command to summarize current web page content
- Added background script for accessing current tab content
- Fixed critical chat response bug where messages were not displaying properly
- Fixed conversation context bug that was causing all responses to be the same
- Improved command recognition in chat input
- Improved conversation history management
- Improved error handling with clearer error messages
- Updated extension description to reflect new default model

## v0.0.5

### Added or Changed

- Updated to support latest OpenAI models (gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.5, o1, o3-mini, o4-mini)
- Removed legacy completion API in favor of chat model API for all functionality
- Improved DALL-E image generation with base64 encoding, prompt display, and error handling
- Added comprehensive image error handling with descriptive error messages
- Added code block copy button that copies raw code content
- Improved security with Content Security Policy
- Better input validation and error handling throughout the application
- Fixed positioning of code block copy button for better visibility
- Removed "click anywhere to copy" functionality in favor of targeted copy buttons

## v0.0.4

### Added or Changed

- Updated description for using LLMs
- Minor bug fixes and improvements

## v0.0.3

### Added or Changed

- Draw mode
- New parameters in settings (Top P, frequency penalty)
- Language support in writer mode
- New formats in writer mode

## v0.0.2

### Added or Changed

- Tabs
- Writer Mode
- Clean up

## v0.0.1

### Added or Changed

- Chat history
- Prompt history
- Copy to clipboard
- Settings
- Markdown support
- Code highlighting
- Dark Mode

### Removed

- Temporary removed the "quick actions"
