/**
 * Sanitizes bot object to remove sensitive fields before sending to frontend
 * Removes encrypted API keys and other sensitive information
 */

exports.sanitizeBotForResponse = (bot) => {
  if (!bot) {
    return null;
  }

  // If it's a Mongoose document, convert to plain object
  const botObj = bot.toObject ? bot.toObject() : bot;

  // Remove sensitive fields
  delete botObj.encrypted_api_key;
  delete botObj.custom_llm_api_key_encrypted;
  delete botObj.custom_llm_api_iv;

  return botObj;
};

exports.sanitizeBotsForResponse = (bots) => {
  if (!Array.isArray(bots)) {
    return exports.sanitizeBotForResponse(bots);
  }

  return bots.map((bot) => exports.sanitizeBotForResponse(bot));
};
