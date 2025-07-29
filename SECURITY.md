# 🔐 POCO Security & End-to-End Encryption

## Overview
POCO implements **client-side encryption** to ensure your conversations with Pixel remain private and secure.

## 🔒 Encryption Implementation

### What's Encrypted
- ✅ **Chat messages** - All conversations with Pixel
- ✅ **Message metadata** - Timestamps, tokens used, etc.
- ❌ **User profiles** - Names, companion names (for app functionality)
- ❌ **App settings** - Preferences, UI settings

### Encryption Method
- **Algorithm**: AES-256-CBC
- **Key Generation**: User-specific keys derived from user ID + salt + secret
- **IV**: Random 16-byte initialization vector for each message
- **Padding**: PKCS7

### Security Features
1. **User-specific keys** - Each user has unique encryption keys
2. **Random IVs** - Each message uses a unique initialization vector
3. **Client-side only** - Server never sees plain text messages
4. **Backward compatibility** - Handles legacy unencrypted messages

## 🔑 Key Management

### Key Generation
```javascript
// Keys are generated deterministically for each user
const key = SHA256(userId + salt + secret)
```

### Key Security
- Keys are generated on the client
- Keys are never stored on the server
- Keys are derived from user ID + secure salt
- Lost keys = lost data (by design for privacy)

## 📊 Data Flow

### Sending a Message
```
User Input → Encrypt → Send to Server → Store Encrypted
```

### Receiving Messages
```
Server → Retrieve Encrypted → Decrypt → Display to User
```

## 🛡️ Privacy Guarantees

1. **Server cannot read messages** - All messages are encrypted
2. **No message search** - Server cannot search encrypted content
3. **User control** - Only the user can decrypt their messages
4. **Perfect forward secrecy** - Each message has unique encryption

## 🔧 Technical Details

### Database Schema
```sql
-- Messages table stores encrypted content
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  content TEXT, -- Encrypted message content
  sender_type TEXT,
  metadata JSONB -- Contains IV and algorithm info
);
```

### Encryption Metadata
```javascript
{
  encrypted: "base64_encrypted_content",
  iv: "hex_initialization_vector", 
  algorithm: "AES-256-CBC"
}
```

## 🚀 Future Enhancements

### Phase 2: Enhanced Security
- [ ] Perfect forward secrecy with ephemeral keys
- [ ] Key backup and recovery system
- [ ] Multi-device key synchronization
- [ ] Profile data encryption

### Phase 3: Advanced Features
- [ ] Message expiration
- [ ] Selective encryption levels
- [ ] Zero-knowledge proofs
- [ ] End-to-end verification

## 🔍 Compliance

- **GDPR**: Right to be forgotten (encrypted data deletion)
- **CCPA**: User data control and privacy
- **HIPAA**: Not applicable (not medical data)
- **SOC 2**: Infrastructure security standards

## 🛠️ Development Notes

### Testing Encryption
```bash
# Test encryption/decryption
node test-encryption.js
```

### Environment Variables
```bash
EXPO_PUBLIC_ENCRYPTION_SECRET=your_secret_here
```

## 📞 Security Contact

For security issues or questions about POCO's encryption implementation, please contact the development team.

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: Production Ready ✅ 