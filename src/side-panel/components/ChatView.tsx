import { Cloud, Cpu, Sparkles, ChevronDown } from 'lucide-preact';
import { useRef, useState, useEffect } from 'preact/hooks';
import { aiManager } from '@bg/managers/ai-manager';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ContextPicker } from './ContextPicker';
import { BridgeSelector } from './BridgeSelector';
import { chatMessages, isLoading, selectedContextTabs, chatEngine, activeSpaceId, currentAppStatus } from '../store';
import { appendChatMessage } from '@lib/storage';
import type { UUID, ISOTimestamp, InboundMessage } from '@lib/types';


export const ChatView = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const [showPicker, setShowPicker] = useState(false);

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
      // Logic moved to BridgeSelector
    };
    fetchInitialStatus();

    const handleMessage = (message: InboundMessage, sender: chrome.runtime.MessageSender) => {
      // Security: Validate sender
      if (sender.id !== chrome.runtime.id) return;
      
      if (message.type === 'AI_RESPONSE_STREAM' && message.payload) {
        const { taskId, chunk, done, error, tabInfo } = message.payload as any;
        if (!taskId || taskId.startsWith('telemetry')) return;
        
        if (tabInfo) {
          // Handled by BridgeSelector/Store
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

    // Persist to local storage ONLY if space is active
    if (activeSpaceId.value) {
      appendChatMessage(activeSpaceId.value, newMessage);
    }

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
      }).then((res) => {
        if (res && !res.ok) {
          console.error('[IcyCrow] Query routing failed:', res.error);
          isLoading.value = false;
          currentAppStatus.value = 'idle';
          
          // Inject a system error message
          chatMessages.value = [...chatMessages.value, {
            id: crypto.randomUUID() as UUID,
            role: 'assistant',
            content: `⚠️ Error: ${res.error?.message || 'Could not connect to Gemini bridge.'}`,
            timestamp: new Date().toISOString() as ISOTimestamp,
            contextTabIds: [],
            taskId
          }];
        }
      });
    }
  };

  // handleFocusBridge removed in favor of manual selection in BridgeSelector

  return (
    <div className="chat-view" ref={containerRef}>
      <div className="chat-header glass-card" style={{ 
        position: 'relative',
        display: 'flex', 
        alignItems: 'center',
        padding: '6px 12px', /* Slightly more horizontal padding */
        margin: '10px 16px 0 16px',
        borderRadius: '12px',
        gap: '8px' /* Reduced gap for compact header */
      }}>
        {/* 1. Engine Selector (Fixed Width) */}
        <div className="engine-selector-pill" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 8px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0
        }}>
          {chatEngine.value === 'gemini' ? <Cloud size={14} style={{ color: 'var(--accent-primary)' }} /> : <Cpu size={14} style={{ color: 'var(--accent-secondary)' }} />}
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600,
            display: width < 320 ? 'none' : 'block' /* Hide label earlier at 320px */
          }}>
            {chatEngine.value === 'gemini' ? 'Cloud' : 'Local'}
          </span>
          <ChevronDown size={10} style={{ opacity: 0.5 }} />
          <select 
            className="engine-select-overlay" 
            value={chatEngine.value}
            onChange={(e) => chatEngine.value = (e.target as HTMLSelectElement).value as any}
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer'
            }}
          >
            <option value="gemini">Gemini Cloud</option>
            <option value="window.ai">Gemini Nano (Local)</option>
          </select>
        </div>
        
        {/* 2. Bridge Selector (Flexible Middle) */}
        {chatEngine.value === 'gemini' ? (
          <div style={{ 
            flex: 1, 
            minWidth: 0, 
            display: 'flex', 
            justifyContent: 'flex-start', /* Align to left on wide screens */
            gap: width < 300 ? '4px' : '8px' 
          }}>
            <BridgeSelector compact={width < 320} width={width} />
          </div>
        ) : (
          <div style={{ flex: 1 }} /> /* Spacer for local engine */
        )}

        {/* 3. Context Button (Fixed Width) */}
        <button 
          className="btn-ghost" 
          onClick={() => setShowPicker(!showPicker)}
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: showPicker ? 'var(--glass-bg)' : 'transparent',
            padding: '6px 10px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: 600,
            flexShrink: 0,
            marginLeft: 'auto' /* Extra insurance for right-alignment */
          }}
        >
          <Sparkles size={14} style={{ color: showPicker ? 'var(--accent-primary)' : 'inherit', flexShrink: 0 }} />
          {width > 360 && <span style={{ flexShrink: 0 }}>Context</span>}
        </button>
      </div>

      {showPicker && (
        <div className="context-picker-overlay">
          <ContextPicker />
        </div>
      )}

      <div className="chat-messages-list">
        {chatMessages.value.length === 0 ? (
          <div className="text-dim" style={{ textAlign: 'center', marginTop: '40px', padding: '0 20px', fontSize: '0.9rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '16px', opacity: 0.5 }}>💬</div>
            No messages yet. {activeSpaceId.value ? 'Ask Gemini about this space!' : 'Select a Space to persist your chat.'}
          </div>
        ) : (
          chatMessages.value.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        {isLoading.value && (
          <div className="chat-message assistant loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span className="dot-flashing">...</span>
          </div>
        )}
      </div>
      <ChatInput 
        onSubmit={handleSendMessage} 
        disabled={isLoading.value} 
      />
    </div>
  );
};
