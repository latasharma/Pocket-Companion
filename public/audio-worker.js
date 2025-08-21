// Audio Processing Web Worker
// This worker handles audio processing in a separate thread to avoid blocking the main UI

self.onmessage = async function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'PROCESS_AUDIO':
      await processAudio(data);
      break;
    default:
      console.warn('Unknown message type:', type);
  }
};

async function processAudio(data) {
  try {
    const { audioBuffer, text } = data;
    
    // Process audio buffer in chunks to avoid memory issues
    const chunkSize = 1024 * 1024; // 1MB chunks
    const chunks = [];
    
    for (let i = 0; i < audioBuffer.byteLength; i += chunkSize) {
      const chunk = audioBuffer.slice(i, i + chunkSize);
      chunks.push(chunk);
    }
    
    // Combine chunks
    const processedBuffer = new Uint8Array(audioBuffer.byteLength);
    let offset = 0;
    
    for (const chunk of chunks) {
      processedBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    // Convert to base64 for data URL
    const audioBase64 = btoa(String.fromCharCode(...processedBuffer));
    const dataUrl = `data:audio/mpeg;base64,${audioBase64}`;
    
    // Send processed audio back to main thread
    self.postMessage({
      type: 'AUDIO_PROCESSED',
      data: {
        audioBuffer: dataUrl,
        text: text
      }
    });
    
  } catch (error) {
    console.error('Audio processing error in worker:', error);
    
    // Send error back to main thread
    self.postMessage({
      type: 'AUDIO_ERROR',
      data: {
        error: error.message,
        text: data.text
      }
    });
  }
}

// Handle worker errors
self.onerror = function(error) {
  console.error('Worker error:', error);
  self.postMessage({
    type: 'AUDIO_ERROR',
    data: {
      error: error.message,
      text: 'Unknown'
    }
  });
};
