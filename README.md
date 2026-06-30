# 🦅 IcyCrow

> **100% Local-First, Zero-cost, Privacy-focused AI tab manager & web annotation platform.**

IcyCrow is a next-generation Chrome Extension that transforms your browser into a powerful, privacy-first knowledge management system. Built entirely on local storage and on-device AI, it ensures your data never leaves your machine.

## ✨ Features

- **Advanced Tab & Space Management**: 
  - Organize your research into dedicated, isolated "Spaces". 
  - Automatically scrub and capture tabs, and sync them effortlessly. 
  - Command-palette driven (press `Ctrl+K` or `Cmd+K`) for lightning-fast navigation and extreme efficiency.
- **Universal Annotation (Web & PDF)**: 
  - 🖍️ **Text Highlighting**: Multi-color text highlighting on any webpage.
  - 📄 **PDF Annotator**: Native PDF viewer with full support for highlights, ink, and notes.
  - ✍️ **Freehand Ink**: Draw and sketch directly over web pages and PDFs.
  - 📝 **Sticky Notes & Callouts**: Anchor rich-text notes and visual callouts directly to specific DOM elements.
- **AI Chat Page**: A dedicated workspace to chat with your local AI about your saved articles, notes, and annotations. Perform deep semantic searches across your knowledge base instantly.
- **Local JSON File Sync**: Annotations and highlights are saved directly to local `.json` files on your hard drive using the modern File System Access API. Bring your own storage, own your data.
- **Integrated Spaced Repetition**: Create flashcards directly from web content and review them natively in your browser using the SM-2 algorithm.
- **On-Device AI (`window.ai`)**: Zero-cost AI integration via Gemini Nano. Summarize articles, perform semantic searches, and query your knowledge base without sending a single byte to the cloud.

## 🛠️ Technology Stack

- **Extension API**: Chrome Manifest V3 (MV3)
- **Frontend Framework**: Preact + Preact Signals
- **Build Tools**: Vite + CRXJS
- **Storage**: `chrome.storage.local` + IndexedDB
- **UI/UX**: Native Glass, Bento Grid UI, CSS Modules

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Chrome / Chromium-based browser (with `window.ai` enabled for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Rohanrathod7/IcyCrow.git
   cd IcyCrow
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load into Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** and select the `dist` directory in the `IcyCrow` folder.

## 🛡️ Privacy & Architecture

IcyCrow is fundamentally designed around privacy:
- **No Backend**: There are no cloud servers, no databases, and no external API calls.
- **Offline First**: Works completely offline.
- **Zero Cost**: Utilizes Chrome's built-in on-device AI capabilities, eliminating API subscription costs.

## 📄 License

MIT License. See `LICENSE` for more information.
