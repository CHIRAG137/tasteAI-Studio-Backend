const UserApiKey = require('../models/UserApiKey');
const { encryptApiKey, decryptApiKey } = require('../utils/encryptionUtils');
const { testCustomLLMConnection } = require('../utils/llmClientUtils');
const logger = require('../utils/logger');

function normalizeProvider(provider) {
  const p = typeof provider === 'string' ? provider.toLowerCase().trim() : '';
  if (!['openai', 'gemini', 'openrouter'].includes(p)) {
    return null;
  }
  return p;
}

function normalizeApiKey(apiKey) {
  if (typeof apiKey !== 'string') {
    return null;
  }
  const trimmed = apiKey.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed;
}

function maskLast4(last4) {
  if (!last4 || typeof last4 !== 'string') {
    return null;
  }
  return `••••${last4}`;
}

exports.listMyApiKeys = async (userId) => {
  const keys = await UserApiKey.find({ user: userId }).lean();
  const byProvider = new Map(keys.map((k) => [k.provider, k]));

  const providers = ['openai', 'gemini', 'openrouter'];
  return {
    keys: providers.map((provider) => {
      const k = byProvider.get(provider);
      return {
        provider,
        hasKey: !!k,
        masked: k?.key_last4 ? maskLast4(k.key_last4) : null,
        updatedAt: k?.updatedAt || null,
      };
    }),
  };
};

exports.upsertMyApiKey = async (userId, provider, apiKey) => {
  const p = normalizeProvider(provider);
  if (!p) {
    throw new Error('Invalid provider. Must be openai or gemini.');
  }

  const normalized = normalizeApiKey(apiKey);
  if (normalized === null) {
    throw new Error('apiKey must be a string');
  }
  if (normalized.length < 10) {
    throw new Error('API key looks too short');
  }
  if (normalized.length > 500) {
    throw new Error('API key looks too long');
  }

  const encrypted = encryptApiKey(normalized);
  const last4 = normalized.slice(-4);

  const doc = await UserApiKey.findOneAndUpdate(
    { user: userId, provider: p },
    { encrypted_api_key: encrypted, key_last4: last4 },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  logger.info('User API key upserted', { userId, provider: p });

  return {
    provider: p,
    hasKey: true,
    masked: maskLast4(last4),
    updatedAt: doc.updatedAt,
  };
};

exports.deleteMyApiKey = async (userId, provider) => {
  const p = normalizeProvider(provider);
  if (!p) {
    throw new Error('Invalid provider. Must be openai, gemini, or openrouter.');
  }

  await UserApiKey.deleteOne({ user: userId, provider: p });
  logger.info('User API key deleted', { userId, provider: p });
  return { provider: p, deleted: true };
};

exports.testMyApiKey = async (userId, provider, model = null) => {
  const p = normalizeProvider(provider);
  if (!p) {
    throw new Error('Invalid provider. Must be openai, gemini, or openrouter.');
  }

  const keyDoc = await UserApiKey.findOne({ user: userId, provider: p }).lean();
  if (!keyDoc?.encrypted_api_key) {
    throw new Error('No saved API key found for this provider.');
  }

  const decrypted = decryptApiKey(keyDoc.encrypted_api_key);
  await testCustomLLMConnection(p, decrypted, model);

  return { validated: true };
};

exports.getDecryptedApiKeyForUser = async (userId, provider) => {
  const p = normalizeProvider(provider);
  if (!p) {
    throw new Error('Invalid provider. Must be openai, gemini, or openrouter.');
  }

  const keyDoc = await UserApiKey.findOne({ user: userId, provider: p }).lean();
  if (!keyDoc?.encrypted_api_key) {
    return null;
  }

  return decryptApiKey(keyDoc.encrypted_api_key);
};
