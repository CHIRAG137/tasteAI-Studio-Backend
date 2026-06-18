'use strict';

const User = require('../../domain/entities/User');

class UserMapper {
  static toDomain(doc) {
    if (!doc) {
      return null;
    }

    const plain = doc.toJSON ? doc.toJSON() : doc;

    return new User({
      id: plain._id?.toString() || plain.id,
      email: plain.email,
      name: plain.name,
      avatarUrl: plain.avatarUrl,
      isActive: plain.isActive,
      isBanned: plain.isBanned,
      isEmailVerified: plain.isEmailVerified,
      banReason: plain.banReason,
      authMethods: plain.authMethods,
      googleId: plain.googleId,
      auth0Id: plain.auth0Id,
      googleProfile: plain.googleProfile,
      auth0Profile: plain.auth0Profile,
      phone: plain.phone,
      pendingQr: plain.pendingQr,
      lastLogin: plain.lastLogin,
      lastLogoutAt: plain.lastLogoutAt,
      refreshTokenFamily: plain.refreshTokenFamily,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    });
  }

  static toPersistence(user) {
    const data = {
      email: user.email?.toLowerCase(),
      name: user.name,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isBanned: user.isBanned,
      isEmailVerified: user.isEmailVerified,
      banReason: user.banReason,
      authMethods: user.authMethods,
      googleId: user.googleId,
      auth0Id: user.auth0Id,
      googleProfile: user.googleProfile,
      auth0Profile: user.auth0Profile,
      phone: user.phone,
      pendingQr: user.pendingQr,
      lastLogin: user.lastLogin,
      lastLogoutAt: user.lastLogoutAt,
      refreshTokenFamily: user.refreshTokenFamily,
    };

    if (user.password) {
      data.password = user.password;
    }

    return data;
  }
}

module.exports = UserMapper;
