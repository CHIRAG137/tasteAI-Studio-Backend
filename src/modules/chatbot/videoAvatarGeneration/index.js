'use strict';

const { createGeminiAvatarClient } = require('./infrastructure/strategies/GeminiAvatarClient');
const { createCloudinaryClient } = require('./infrastructure/strategies/CloudinaryClient');
const GeminiAvatarProvider = require('./infrastructure/providers/GeminiAvatarProvider');
const CloudinaryAvatarProvider = require('./infrastructure/providers/CloudinaryAvatarProvider');
const AvatarProviderFactory = require('./infrastructure/providers/AvatarProviderFactory');
const AvatarGenerationFacade = require('./application/facades/AvatarGenerationFacade');
const AvatarGenerationController = require('./presentation/controllers/AvatarGenerationController');
const { createAvatarGenerationRoutes } = require('./presentation/routes/AvatarGenerationRoutes');
const uploadMiddleware = require('./presentation/middleware/AvatarUploadMiddleware');

function createAvatarGenerationSubModule({ authGuard } = {}) {
  const geminiAvatarClient = createGeminiAvatarClient();
  const cloudinaryClient = createCloudinaryClient();
  const geminiAvatarProvider = new GeminiAvatarProvider(geminiAvatarClient);
  const cloudinaryAvatarProvider = new CloudinaryAvatarProvider(cloudinaryClient);

  const providerFactory = new AvatarProviderFactory();
  providerFactory.register(geminiAvatarProvider);
  providerFactory.register(cloudinaryAvatarProvider);

  const avatarGenerationFacade = new AvatarGenerationFacade({
    avatarProvider: geminiAvatarProvider,
    storageProvider: cloudinaryAvatarProvider,
  });

  const avatarGenerationController = new AvatarGenerationController({ avatarGenerationFacade });

  const router = createAvatarGenerationRoutes({
    avatarGenerationController,
    authGuard,
    uploadMiddleware,
  });

  return { router };
}

module.exports = { createAvatarGenerationSubModule };
