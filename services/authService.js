const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createToken = (user) => {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

exports.register = async ({ email, password, name }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw new Error("User already exists");
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashedPassword, name });
  const token = createToken(user);
  return { token, user };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user || !user.password) throw new Error("Invalid credentials");
  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new Error("Invalid credentials");
  const token = createToken(user);
  return { token, user };
};

exports.googleLogin = async (googleToken) => {
  const ticket = await client.verifyIdToken({
    idToken: googleToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  const { email, name, sub: googleId } = payload;

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, name, googleId });
  }

  const token = createToken(user);
  return { token, user };
};
