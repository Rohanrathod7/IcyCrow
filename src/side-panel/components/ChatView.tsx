import { useState, useEffect } from 'preact/hooks';
import { aiManager } from '@bg/managers/ai-manager';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ContextPicker } from './ContextPicker';
import { chatMessages, isLoading, selectedContextTabs, chatEngine, activeSpaceId, currentAppStatus } from '../store';
import { appendChatMessage } from '@lib/storage';
import type { UUID, ISOTimestamp, InboundMessage, SessionState } from '@lib/types';

export const ChatView = () => {
  const [showPicker, setShowPicker] = useState(false);
  const [connectedTab, setConnectedTab] = useState<{ title: string; url: string; id: number } | null>(null);

  const handleIncomingPrompt = async (payload: { text: string; action: string; pdfTitle?: string }) => {
    // [PROMPT ROUTING]: Format based on action type
    const prefix = payload.action === 'explain' 
      ? 'Explain this concept from my reading: \n\n' 
      : 'Summarize this text into key bullet points: \n\n';
    
    const contextStr = payload.pdfTitle ? `> From: ${payload.pdfTitle}\n\n` : '';
    const fullPrompt = `${contextStr}${prefix}${payload.text}`;

    handleSendMessage(fullPrompt);
  };

  useEffect(() => {
    // [BUFFER CONSUMPTION]: Check for pending prompts on mount
    const consumeBuffer = async () => {
      const res = await chrome.storage.session.get('pendingPrompt');
      if (res.pendingPrompt) {
        const payload = res.pendingPrompt as { text: string; action: 'explain' | 'summarize'; pdfTitle?: string };
        // [PREVENT DOUBLE-FIRE]: Clear immediately
        await chrome.storage.session.remove('pendingPrompt');
        handleIncomingPrompt(payload);
      }
    };
    consumeBuffer();

    // [PREVENT STUCK STATE]: Ensure mascot returns to idle if navigating away
    return () => {
      currentAppStatus.value = 'idle';
    };
  }, []);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      const res = await chrome.storage.session.get('sessionState');
      const state = (res.sessionState as SessionState) || {};
      const targetId = state.manualGeminiTabId || (state.geminiTabIds?.[0] || state.geminiTabId);
      if (targetId) {
        try {
          const tab = await chrome.tabs.get(targetId);
          if (tab) setConnectedTab({ title: tab.title || 'Gemini', url: tab.url || '', id: tab.id! });
        } catch (e) {
          console.warn('[ChatView] Failed to fetch initial bridge tab:', e);
        }
      }
    };
    fetchInitialStatus();

    const handleMessage = (message: InboundMessage, sender: chrome.runtime.MessageSender) => {
      // Security: Validate sender
      if (sender.id !== chrome.runtime.id) return;
      
      if (message.type === 'AI_RESPONSE_STREAM' && message.payload) {
        const { taskId, chunk, done, error, tabInfo } = message.payload as any;
        if (!taskId) return;
        
        if (tabInfo) {
          setConnectedTab(tabInfo);
        }
        
        // Find existing assistant message for this task or create one
        const messages = [...chatMessages.value];
        let assistantMsgIndex = messages.findIndex(m => m.taskId === taskId && m.role === 'assistant');
        
        if (assistantMsgIndex === -1) {
          const newAssistantMsg = {
            id: crypto.randomUUID() as UUID,
            role: 'assistant' as const,
            content: chunk || '',
            timestamp: new Date().toISOString() as ISOTimestamp,
            contextTabIds: [],
            taskId: taskId as UUID
          };
          chatMessages.value = [...messages, newAssistantMsg];
        } else {
          // Gemini sends full text, Nano sends chunks
          const isGemini = chatEngine.value === 'gemini';
          messages[assistantMsgIndex] = {
            ...messages[assistantMsgIndex],
            content: (isGemini && chunk) ? chunk : (messages[assistantMsgIndex].content + (chunk || ''))
          };
          chatMessages.value = [...messages];
        }

        if (done || error) {
          isLoading.value = false;
          currentAppStatus.value = 'idle';
          if (error) console.error('AI Stream Error:', error);
        }
      } else if (message.type === 'EXPLAIN_TEXT_REQUEST') {
        const payload = message.payload as any;
        // [PREVENT DOUBLE-FIRE]: Clear immediately in case we just opened
        chrome.storage.session.remove('pendingPrompt');
        handleIncomingPrompt(payload);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleSendMessage = (content: string) => {
    if (!activeSpaceId.value) return;

    const taskId = crypto.randomUUID() as UUID;
    const timestamp = new Date().toISOString() as ISOTimestamp;

    const newMessage = {
      id: crypto.randomUUID() as UUID,
      role: 'user' as const,
      content,
      timestamp,
      contextTabIds: selectedContextTabs.value.map(t => t.tabId),
      taskId
    };

    chatMessages.value = [...chatMessages.value, newMessage];
    isLoading.value = true;
    currentAppStatus.value = 'thinking';
    setShowPicker(false);

    // Persist to local storage
    appendChatMessage(activeSpaceId.value, newMessage);

    if (chatEngine.value === 'window.ai') {
      aiManager.queryBuiltIn(content, (chunk) => {
        // Mock the logic from the background to update signals directly
        const messages = [...chatMessages.value];
        let assistantMsgIndex = messages.findIndex(m => m.taskId === taskId && m.role === 'assistant');
        
        if (assistantMsgIndex === -1) {
          const newMsg = {
            id: crypto.randomUUID() as UUID,
            role: 'assistant' as const,
            content: chunk || '',
            timestamp: new Date().toISOString() as ISOTimestamp,
            contextTabIds: [],
            taskId: taskId as UUID
          };
          chatMessages.value = [...messages, newMsg];
        } else {
          messages[assistantMsgIndex] = {
            ...messages[assistantMsgIndex],
            content: messages[assistantMsgIndex].content + (chunk || '')
          };
          chatMessages.value = messages;
        }
      }).then(() => {
        isLoading.value = false;
        currentAppStatus.value = 'idle';
      }).catch(err => {
        isLoading.value = false;
        currentAppStatus.value = 'idle';
        console.error('Local AI Error:', err);
      });
    } else {
      chrome.runtime.sendMessage({
        type: 'AI_QUERY',
        payload: {
          taskId,
          prompt: content,
          spaceId: activeSpaceId.value,
          timestamp
        }
      });
    }
  };

  return (
    <div className="chat-view">
      <div className="chat-header glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        padding: '10px 16px',
        margin: '10px 16px 0 16px',
        borderRadius: '12px'
      }}>
        <select 
          className="engine-select btn-ghost" 
          data-testid="engine-selector"
          value={chatEngine.value}
          onChange={(e) => chatEngine.value = (e.target as HTMLSelectElement).value as any}
          style={{ border: 'none', background: 'transparent', outline: 'none' }}
        >
          <option value="gemini">Gemini Bridge (Cloud)</option>
          <option value="window.ai">Gemini Nano (Local)</option>
        </select>
        {chatEngine.value === 'gemini' && (
          <div className="bridge-status-mini" style={{ 
            fontSize: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px',
            opacity: 0.8
          }}>
            <span style={{ color: connectedTab ? '#22c55e' : '#ef4444' }}>●</span>
            <span className="truncate" style={{ maxWidth: '120px' }}>
              {connectedTab ? connectedTab.title : 'No Bridge Connected'}
            </span>
          </div>
        )}
        <button 
          className="btn-ghost" 
          onClick={() => setShowPicker(!showPicker)}
          style={{ background: showPicker ? 'var(--glass-bg)' : 'transparent' }}
        >
          {showPicker ? 'Close Context' : '✨ Context'}
        </button>
      </div>

      {showPicker && (
        <div className="context-picker-overlay">
          <ContextPicker />
        </div>
      )}

      <div className="chat-messages-list">
        {!activeSpaceId.value ? (
          <div className="empty-state glass-card" style={{ margin: '20px', padding: '20px', textAlign: 'center' }}>
            <p className="text-dim">No space selected.</p>
            <p style={{ fontSize: '0.85em', margin: '8px 0 16px 0' }}>Chat history and context are tied to specific spaces.</p>
            <button 
              className="btn-primary small" 
              onClick={() => {
                import('../store').then(m => m.activeView.value = 'spaces');
              }}
            >
              Go to Spaces
            </button>
          </div>
        ) : chatMessages.value.length === 0 ? (
          <div className="text-dim" style={{ textAlign: 'center', marginTop: '20px' }}>
            No messages yet. Ask Gemini about your open tabs!
          </div>
        ) : (
          chatMessages.value.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        {isLoading.value && (
          <div className="chat-message assistant loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className="dot-flashing">...</span>
            {connectedTab && (
              <div className="text-dim" style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8 }}>
                📡 Linked to: <strong>{connectedTab.title}</strong>
              </div>
            )}
          </div>
        )}
      </div>
      <ChatInput onSubmit={handleSendMessage} disabled={isLoading.value || !activeSpaceId.value} />
    </div>
  );
};
