const { OAuth2Client } = require('google-auth-library');

let _googleClient = null;
exports.googleClient = function googleClient() {
  if (!_googleClient) {
    _googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return _googleClient;
};
