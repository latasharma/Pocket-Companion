import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';

class DeviceIdService {
  constructor() {
    this.deviceId = null;
    this.isInitialized = false;
  }

  /**
   * Generate a simple UUID v4 without external dependency
   */
  generateSimpleUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Remove any known prefixes from device ID
   */
  cleanDeviceId(id) {
    if (!id) return id;
    // Remove common prefixes: device-, android-, ios-, etc.
    return id.replace(/^(device-|android-|ios-|uuid-)/i, '');
  }

  /**
   * Initialize device ID - load from secure storage or generate new one
   */
  async initialize() {
    try {
      // Try to get existing device ID from secure storage
      const storedDeviceId = await SecureStore.getItemAsync('secure_device_id');
      
      if (storedDeviceId) {
        this.deviceId = this.cleanDeviceId(storedDeviceId);
        console.log('🔐 Device ID loaded from secure storage:', this.deviceId);
        this.isInitialized = true;
        return this.deviceId;
      }

      // Generate a new device ID using Android ID (if available)
      const deviceId = await this.generateDeviceId();
      
      // Store it securely for future use
      try {
        await SecureStore.setItemAsync('secure_device_id', deviceId);
        console.log('🔐 Device ID stored securely');
      } catch (storeError) {
        console.warn('⚠️ Could not store device ID in secure storage:', storeError.message);
      }
      
      this.deviceId = deviceId;
      this.isInitialized = true;
      
      console.log('🔐 Device ID generated:', deviceId);
      return deviceId;
    } catch (error) {
      console.error('❌ Error initializing device ID:', error);
      // Fallback to a random UUID if secure storage fails
      const fallbackId = this.generateFallbackId();
      this.deviceId = fallbackId;
      this.isInitialized = true;
      return fallbackId;
    }
  }

  /**
   * Generate a unique device ID using Android ID and UUID
   */
  async generateDeviceId() {
    try {
      // Try to get Android ID (unique per device, per app signing key)
      let androidId = null;
      try {
        androidId = await Application.getAndroidId();
        if (androidId) {
          console.log('🔐 Android ID fetched successfully:', androidId);
          // Clean any prefix and use Android ID as device identifier
          const cleanId = this.cleanDeviceId(androidId);
          console.log('🔐 Using Android ID as device identifier');
          return cleanId;
        }
      } catch (e) {
        console.log('🔐 Android ID not available (iOS or emulator)');
      }

      // Fallback to pure UUID for iOS or when Android ID is not available
      const uuid = this.generateSimpleUUID();
      console.log('🔐 Using UUID as device identifier:', uuid);
      return uuid;
    } catch (error) {
      console.error('❌ Error generating device ID:', error);
      return this.generateFallbackId();
    }
  }

  /**
   * Generate a fallback device ID if all else fails
   */
  generateFallbackId() {
    const uuid = this.generateSimpleUUID();
    console.log('⚠️ Using fallback device ID:', uuid);
    return uuid;
  }

  /**
   * Get the current device ID
   */
  async getDeviceId() {
    if (!this.isInitialized) {
      return await this.initialize();
    }
    return this.deviceId;
  }

  /**
   * Reset the device ID and generate a new one
   */
  async resetDeviceId() {
    try {
      await SecureStore.deleteItemAsync('secure_device_id');
      this.deviceId = null;
      this.isInitialized = false;
      console.log('🔄 Device ID reset');
      return await this.initialize();
    } catch (error) {
      console.error('❌ Error resetting device ID:', error);
      return this.generateFallbackId();
    }
  }

  /**
   * Clear device ID from secure storage
   */
  async clearDeviceId() {
    try {
      await SecureStore.deleteItemAsync('secure_device_id');
      this.deviceId = null;
      this.isInitialized = false;
      console.log('🧹 Device ID cleared from secure storage');
    } catch (error) {
      console.error('❌ Error clearing device ID:', error);
    }
  }
}

export const deviceIdService = new DeviceIdService();