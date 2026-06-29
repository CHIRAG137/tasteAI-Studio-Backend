'use strict';

const axios = require('axios');

const IAuthProvider = require('../../domain/providers/IAuthProvider');

const AuthProviderTypes = require('../../domain/providers/AuthProviderTypes');

class Auth0AuthProvider extends IAuthProvider {
  constructor(userRepository) {
    super();

    this.userRepository = userRepository;
  }

  getType() {
    return AuthProviderTypes.AUTH0;
  }

  async authenticate(command) {
    const { data } = await axios.get(`https://${process.env.AUTH0_DOMAIN}/userinfo`, {
      headers: {
        Authorization: `Bearer ${command.accessToken}`,
      },
    });

    const user = await this.userRepository.findByEmail(data.email);

    return {
      user,
      profile: data,
    };
  }
}

module.exports = Auth0AuthProvider;
