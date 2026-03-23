---
description: Patterns for handling large binary data (Blobs/Buffers) between MV3 Service Workers and Extension UI.
domain: mv3-service-worker
triggers: ["When implementing file export or download", "When passing binary data from Service Worker to UI"]
---
# MV3 Binary Messaging & Local Blob Handling

**Context:** Transferring binary data from a Service Worker (SW) to an extension UI (Side Panel/Popup) for download or processing.

## Problem
In MV3, Service Workers are ephemeral. If you create a `blob:` URL using `URL.createObjectURL(blob)` inside the Service Worker and pass that URL to the UI, the link will break if the Service Worker enters a sleep cycle or restarts before the user clicks download. The Blob URL is revoked when the context that created it (the SW) is destroyed.

## Solution
Always transfer the raw binary data (e.g., `ArrayBuffer`) across the message bridge and perform the `URL.createObjectURL` call inside the long-lived UI context (Side Panel or active Popup).

1. **SW**: Fetch/Generate the data as an `ArrayBuffer`.
2. **Messaging**: Return the `ArrayBuffer` in the response payload.
3. **UI**: Receive the buffer, create a `Blob` locally, and trigger the download.

## Example

### Service Worker (background.ts)
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXPORT_DATA') {
    generateBinaryData().then(buffer => {
      // Send raw buffer, NOT a blob URL
      sendResponse({ ok: true, data: { arrayBuffer: buffer } });
    });
    return true; // Keep channel open
  }
});
```

### UI Component (ExportView.tsx)
```typescript
const handleDownload = async () => {
  // Use messaging bridge
  const result = await chrome.runtime.sendMessage({ type: 'EXPORT_DATA' });
  
  if (result.ok && result.data.arrayBuffer) {
    // Create blob in the UI context to ensure persistence
    const blob = new Blob([result.data.arrayBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup.dat';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up locally
  }
};
```
