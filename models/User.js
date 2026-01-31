const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // authenticated user email address
  email: { type: String, required: true, unique: true },
  
  // authenticated user password
  password: { type: String },
  
  // authenticated user name
  name: { type: String },
  
  // authenticated user google Id(if preferred method of login is google login)
  googleId: { type: String },
});

module.exports = mongoose.model('User', userSchema);
