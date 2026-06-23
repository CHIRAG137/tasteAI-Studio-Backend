'use strict';

const { createGeminiClient } = require('./infrastructure/ai/GeminiClient');

const { createCloudinaryClient } = require('./infrastructure/storage/CloudinaryClient');

const GeminiAvatarGenerationService = require('./infrastructure/ai/GeminiAvatarGenerationService');

const CloudinaryAvatarStorageService = require('./infrastructure/storage/CloudinaryAvatarStorageService');

const MongoAvatarRepository = require('./infrastructure/persistence/MongoAvatarRepository');

const GenerateAvatarUseCase = require('./application/usecases/GenerateAvatarUseCase');

const UploadAvatarUseCase = require('./application/usecases/UploadAvatarUseCase');

const AvatarGenerationController = require('./api/controllers/AvatarGenerationController');

const { createAvatarGenerationRoutes } = require('./api/routes/AvatarGenerationRoutes');

const uploadMiddleware = require('./api/middleware/AvatarUploadMiddleware');

function createAvatarGenerationSubModule({ authGuard } = {}) {
  // Infrastructure

  const geminiClient = createGeminiClient();

  const cloudinaryClient = createCloudinaryClient();

  const avatarGenerationService = new GeminiAvatarGenerationService(geminiClient);

  const avatarStorageService = new CloudinaryAvatarStorageService(cloudinaryClient);

  const avatarRepository = new MongoAvatarRepository({});

  // Application

  const generateAvatarUseCase = new GenerateAvatarUseCase({
    avatarGenerationService,
  });

  const uploadAvatarUseCase = new UploadAvatarUseCase({
    avatarStorageService,
    avatarRepository,
  });

  // API

  const avatarGenerationController = new AvatarGenerationController({
    generateAvatarUseCase,
    uploadAvatarUseCase,
  });

  const router = createAvatarGenerationRoutes({
    avatarGenerationController,
    authGuard,
    uploadMiddleware,
  });

  return {
    router,
  };
}

module.exports = {
  createAvatarGenerationSubModule,
};
