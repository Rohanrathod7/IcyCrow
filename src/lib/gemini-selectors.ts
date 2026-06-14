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
    'button[aria-label*="Send"]',
    'button[aria-label*="send"]',
    'button.send-button',
    'button[class*="send"]',
    'button:has(mat-icon[svgicon*="send"])',
    'button:has(mat-icon[svgicon*="Send"])'
  ],
  stopButton: [
    'button[aria-label="Stop generating"]',
    'button[aria-label="Stop"]',
    'button[aria-label*="Stop"]',
    'button[aria-label*="stop"]',
    'button:has(mat-icon[svgicon*="stop"])',
    'button:has(div.stop-icon)'
  ],
  responseContainer: [
    'model-response',
    '.response-container',
    'message-content'
  ]
};
