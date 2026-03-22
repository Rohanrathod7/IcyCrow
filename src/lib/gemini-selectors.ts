/**
 * Multi-candidate selector map for Gemini UI.
 * Used to provide fallbacks when Google updates the DOM.
 */
export const GEMINI_SELECTORS = {
  inputField: [
    'div[contenteditable="true"]',
    'rich-textarea textarea',
    '.ql-editor'
  ],
  sendButton: [
    'button[aria-label="Send message"]',
    'button.send-button',
    'button:has(mat-icon[svgicon="send"])'
  ],
  responseContainer: [
    'model-response',
    '.response-container',
    'message-content'
  ]
};
