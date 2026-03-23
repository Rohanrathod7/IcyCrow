import { useMemo } from 'preact/hooks';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import type { ChatMessage as ChatMessageType } from '../../lib/types';

// Configure marked with custom renderer for code blocks
const renderer = new marked.Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const validLang = lang && hljs.getLanguage(lang) ? lang : 'bash';
  const highlighted = hljs.highlight(text, { language: validLang }).value;
  return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
};

marked.setOptions({ renderer });

interface Props {
  message: ChatMessageType;
}

export const ChatMessage = ({ message }: Props) => {
  const isAssistant = message.role === 'assistant';
  
  const htmlContent = useMemo(() => {
    const rawHtml = marked.parse(message.content);
    return DOMPurify.sanitize(rawHtml as string);
  }, [message.content]);

  return (
    <div className={`chat-message ${message.role}`}>
      <div className="message-header">
        <span className="role-label">{isAssistant ? 'IcyCrow' : 'You'}</span>
        <span className="timestamp">{new Date(message.timestamp).toLocaleTimeString()}</span>
      </div>
      <div 
        className="message-body" 
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
};
