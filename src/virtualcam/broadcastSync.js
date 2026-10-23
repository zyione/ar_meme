// BroadcastChannel synchronizer between Studio Editor and Virtual Cam outputs
const CHANNEL_NAME = 'ar_meme_studio_channel';

export class StudioSync {
  constructor(onMessageCallback) {
    this.channel = null;
    this.onMessage = onMessageCallback || null;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          if (this.onMessage && event.data) {
            this.onMessage(event.data);
          }
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported, fallback to localStorage', e);
    }
  }

  emit(type, payload = {}) {
    const message = { type, payload, timestamp: Date.now() };
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (e) {
        console.warn('Failed to postMessage on channel:', e);
      }
    }
    // Also save to localStorage as fallback
    try {
      localStorage.setItem('ar_meme_sync_event', JSON.stringify(message));
    } catch (_) {}
  }

  destroy() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}
