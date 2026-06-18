'use strict';

/**
 * Barrel export for all auth domain exceptions.
 *
 * @example
 * const { InvalidCredentialsException, UserNotFoundException } = require('../exceptions');
 */
module.exports = {
  AuthException: require('./AuthException'),
  AccountExistsException: require('./AccountExistsException'),
  InvalidCredentialsException: require('./InvalidCredentialsException'),
  QrSessionException: require('./QrSessionException'),
  UnsupportedAuthProviderException: require('./UnsupportedAuthProviderException'),
  UserBannedException: require('./UserBannedException'),
  UserInactiveException: require('./UserInactiveException'),
  UserNotFoundException: require('./UserNotFoundException'),
};
