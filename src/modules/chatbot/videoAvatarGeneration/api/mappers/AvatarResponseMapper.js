'use strict';

const AvatarResponseMapper = {
  generateAvatar(result) {
    return {
      success: true,
      data: {
        videoBotImageBase64: result.videoBotImageBase64,

        videoBotImageMimeType: result.videoBotImageMimeType,
      },
    };
  },

  uploadAvatar(avatar) {
    return {
      success: true,
      data: {
        videoBotImageUrl: avatar.imageUrl,

        videoBotImagePublicId: avatar.publicId,
      },
    };
  },
};

module.exports = AvatarResponseMapper;
