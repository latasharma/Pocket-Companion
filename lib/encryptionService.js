import CryptoJS from 'crypto-js';

export class EncryptionService {
  // Generate a unique encryption key for each user
  static generateUserKey(userId) {
    // Create a deterministic key based on user ID and a secret salt
    const salt = 'POCO_SECURE_SALT_2024_V2';
    const keyMaterial = userId + salt + (process.env.EXPO_PUBLIC_ENCRYPTION_SECRET || 'DEFAULT_SECRET');
    return CryptoJS.SHA256(keyMaterial).toString();
  }

  // Simple XOR-based encryption for React Native compatibility
  static encryptMessage(message, userId) {
    try {
      const key = this.generateUserKey(userId);
      const keyBytes = CryptoJS.enc.Utf8.parse(key.substring(0, 32));
      
      // Simple XOR encryption with key
      let encrypted = '';
      for (let i = 0; i < message.length; i++) {
        const charCode = message.charCodeAt(i) ^ keyBytes.words[i % keyBytes.words.length];
        encrypted += String.fromCharCode(charCode);
      }
      
      // Convert to base64 using CryptoJS (handles Unicode properly)
      const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encrypted));
      
      return {
        encrypted: base64,
        iv: key.substring(0, 16),
        algorithm: 'XOR-BASE64'
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }

  // Decrypt a message
  static decryptMessage(encryptedData, userId) {
    try {
      const key = this.generateUserKey(userId);
      const keyBytes = CryptoJS.enc.Utf8.parse(key.substring(0, 32));
      
      // Decode from base64 using CryptoJS
      const encrypted = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(encryptedData.encrypted));
      
      // XOR decryption with key
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const charCode = encrypted.charCodeAt(i) ^ keyBytes.words[i % keyBytes.words.length];
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }

  // Encrypt user profile data
  static encryptProfileData(profileData, userId) {
    try {
      const key = this.generateUserKey(userId);
      const profileString = JSON.stringify(profileData);
      const keyBytes = CryptoJS.enc.Utf8.parse(key.substring(0, 32));
      
      // Simple XOR encryption with key
      let encrypted = '';
      for (let i = 0; i < profileString.length; i++) {
        const charCode = profileString.charCodeAt(i) ^ keyBytes.words[i % keyBytes.words.length];
        encrypted += String.fromCharCode(charCode);
      }
      
      // Convert to base64 using CryptoJS (handles Unicode properly)
      const base64 = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(encrypted));
      
      return {
        encrypted: base64,
        iv: key.substring(0, 16),
        algorithm: 'XOR-BASE64'
      };
    } catch (error) {
      console.error('Profile encryption error:', error);
      throw new Error('Failed to encrypt profile data');
    }
  }

  // Decrypt user profile data
  static decryptProfileData(encryptedData, userId) {
    try {
      const key = this.generateUserKey(userId);
      const keyBytes = CryptoJS.enc.Utf8.parse(key.substring(0, 32));
      
      // Decode from base64 using CryptoJS
      const encrypted = CryptoJS.enc.Utf8.stringify(CryptoJS.enc.Base64.parse(encryptedData.encrypted));
      
      // XOR decryption with key
      let decrypted = '';
      for (let i = 0; i < encrypted.length; i++) {
        const charCode = encrypted.charCodeAt(i) ^ keyBytes.words[i % keyBytes.words.length];
        decrypted += String.fromCharCode(charCode);
      }
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Profile decryption error:', error);
      throw new Error('Failed to decrypt profile data');
    }
  }

  // Generate a secure random key for additional security
  static generateSecureKey() {
    return CryptoJS.lib.WordArray.random(32).toString();
  }

  // Hash sensitive data for storage
  static hashSensitiveData(data) {
    return CryptoJS.SHA256(data).toString();
  }

  // Verify data integrity
  static verifyIntegrity(data, hash) {
    const computedHash = this.hashSensitiveData(data);
    return computedHash === hash;
  }
} 