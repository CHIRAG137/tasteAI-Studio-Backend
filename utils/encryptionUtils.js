const crypto = require('crypto');

/**
 * Encrypts an API key using AES-256-GCM
 * Returns a JSON object with encrypted data and IV
 */
exports.encryptApiKey = (apiKey) => {
  if (!apiKey) {
    return null;
  }

  const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('API_KEY_ENCRYPTION_KEY environment variable is not set');
  }

  // Ensure encryption key is 32 bytes for AES-256
  const key = crypto.createHash('sha256').update(encryptionKey).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Store all required data to decrypt later
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

/**
 * Decrypts an API key (only for internal use if needed for validation)
 * This should NOT be exposed in responses
 */
exports.decryptApiKey = (encryptedData) => {
  if (!encryptedData) {
    return null;
  }

  const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('API_KEY_ENCRYPTION_KEY environment variable is not set');
  }

  try {
    const key = crypto.createHash('sha256').update(encryptionKey).digest();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(encryptedData.iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API key');
  }
};

module.exports = exports;
