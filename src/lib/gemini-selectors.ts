/**
 * Multi-candidate selector map for Gemini UI.
 * Used to provide fallbacks when Google updates the DOM.
 */
export const GEMINI_SELECTORS = {
  inputField: [
    'rich-textarea div[contenteditable="true"]:not(.ql-clipboard):not(.ql-hidden)',
    'rich-textarea p',
    'rich-textarea textarea',
    'div[contenteditable="true"]:not(.ql-clipboard):not(.ql-hidden)',
    '.ql-editor:not(.ql-clipboard):not(.ql-hidden)'
  ],
  sendButton: [
    'button[aria-label="Send message"]',
    'button.send-button',
    'button:has(mat-icon[svgicon="send"])'
  ],
  stopButton: [
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop"]',
    'button:has(mat-icon[svgicon="stop"])',
    'button:has(div.stop-icon)'
  ],
  responseContainer: [
    'message-content',
    'model-response',
    '.response-container'
  ]
};
