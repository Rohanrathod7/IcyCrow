import { useState } from 'preact/hooks';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ContextPicker } from './ContextPicker';
import { chatMessages, isLoading, selectedContextTabs } from '../store';
import type { UUID, ISOTimestamp } from '../../lib/types';

export const ChatView = () => {
  const [showPicker, setShowPicker] = useState(false);

  const handleSendMessage = (content: string) => {
    // Phase 4 will handle the real logic, for now we just append to sync UI
    const newMessage = {
      id: crypto.randomUUID() as UUID,
      role: 'user' as const,
      content,
      timestamp: new Date().toISOString() as ISOTimestamp,
      contextTabIds: selectedContextTabs.value.map(t => t.tabId),
      taskId: null
    };
    chatMessages.value = [...chatMessages.value, newMessage];
    // In real app, we might want to clear selection after sending
    // selectedContextTabs.value = [];
    setShowPicker(false);
  };

  return (
    <div className="chat-view">
      <div className="chat-header flex-row">
        <span className="text-dim">{selectedContextTabs.value.length} tabs in context</span>
        <button 
          className="btn-ghost" 
          onClick={() => setShowPicker(!showPicker)}
        >
          {showPicker ? 'Hide Context' : 'Change Context'}
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
