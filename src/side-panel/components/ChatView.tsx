import { useState, useEffect } from 'preact/hooks';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ContextPicker } from './ContextPicker';
import { chatMessages, isLoading, selectedContextTabs, chatEngine, activeSpaceId } from '../store';
import { appendChatMessage } from '@lib/storage';
import type { UUID, ISOTimestamp, InboundMessage } from '@lib/types';

export const ChatView = () => {
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    const handleMessage = (message: InboundMessage, sender: chrome.runtime.MessageSender) => {
      // Security: Validate sender
      if (sender.id !== chrome.runtime.id) return;
      
      if (message.type === 'AI_RESPONSE_STREAM' && message.payload) {
        const { taskId, chunk, done, error } = message.payload;
        if (!taskId) return;
        
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
          messages[assistantMsgIndex] = {
            ...messages[assistantMsgIndex],
            content: messages[assistantMsgIndex].content + (chunk || '')
          };
          chatMessages.value = messages;
        }

        if (done || error) {
          isLoading.value = false;
          if (error) {
            console.error('AI Stream Error:', error);
          }
        }
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
    setShowPicker(false);

    // Persist to local storage
    appendChatMessage(activeSpaceId.value, newMessage);

    const useLocal = chatEngine.value === 'window.ai';
    chrome.runtime.sendMessage({
      type: useLocal ? 'WINDOW_AI_QUERY' : 'AI_QUERY',
      payload: {
        taskId,
        prompt: content,
        spaceId: activeSpaceId.value,
        timestamp
      }
    });
  };

  return (
    <div className="chat-view">
      <div className="chat-header flex-row">
        <select 
          className="engine-select" 
          data-testid="engine-selector"
          value={chatEngine.value}
          onChange={(e) => chatEngine.value = (e.target as HTMLSelectElement).value as any}
        >
          <option value="gemini">Gemini Bridge (Cloud)</option>
          <option value="window.ai">Gemini Nano (Local)</option>
        </select>
        <button 
          className="btn-ghost" 
          onClick={() => setShowPicker(!showPicker)}
        >
          {showPicker ? 'Hide Context' : 'Add Context'}
        </button>
      </div>

      {showPicker && (
        <div className="context-picker-overlay">
          <ContextPicker />
        </div>
      )}

      <div className="chat-messages-list">
        {chatMessages.value.length === 0 ? (
          <div className="text-dim" style={{ textAlign: 'center', marginTop: '20px' }}>
            No messages yet. Ask Gemini about your open tabs!
          </div>
        ) : (
          chatMessages.value.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        {isLoading.value && (
          <div className="chat-message assistant loading">
            <span className="dot-flashing">...</span>
          </div>
        )}
      </div>
      <ChatInput onSubmit={handleSendMessage} disabled={isLoading.value} />
    </div>
  );
};
