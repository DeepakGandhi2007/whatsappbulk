const { v4: uuidv4 } = require("uuid");
const User = require("./models/User");

let activeSessions = []; // [{ userId, deviceId, token }]

// Register new user
exports.register = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password required" });
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({ success: false, message: "User already exists" });
  }

  const newUser = new User({
    email,
    password,
    dailyCount: 0,
    lastReset: null
  });

  await newUser.save();
  res.json({ success: true, userId: newUser._id });
};

// Login
exports.login = async (req, res) => {
  const { email, password, deviceId } = req.body;

  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const existingSession = activeSessions.find(s => s.userId.toString() === user._id.toString());

  if (!existingSession) {
    const newSession = { userId: user._id, deviceId, token: uuidv4() };
    activeSessions.push(newSession);
    return res.json({ success: true, token: newSession.token, userId: user._id });
  }

  if (existingSession.deviceId === deviceId) {
    return res.json({ success: true, token: existingSession.token, userId: user._id });
  }

  return res.status(403).json({ success: false, message: "Account in use on another device" });
};

// Logout
exports.logout = (req, res) => {
  const { token } = req.body;
  const index = activeSessions.findIndex(s => s.token === token);
  if (index !== -1) {
    activeSessions.splice(index, 1);
    return res.json({ success: true });
  }
  res.status(400).json({ success: false });
};

// Check auth
exports.checkAuth = (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  const session = activeSessions.find(s => s.token === token);
  if (session) {
    return res.json({ success: true, userId: session.userId });
  }
  res.status(401).json({ success: false });
};
