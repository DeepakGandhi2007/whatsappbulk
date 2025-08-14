const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const USERS_FILE = path.join(__dirname, "users.json");

let activeSessions = []; // [{ userId, deviceId, token }]

// Utility: Load users from file
function loadUsers() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]));
    }
    const data = fs.readFileSync(USERS_FILE);
    return JSON.parse(data);
}

// Utility: Save users to file
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Register new user
exports.register = (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password required" });
    }

    let users = loadUsers();

    if (users.find(u => u.email === email)) {
        return res.status(409).json({ success: false, message: "User already exists" });
    }

    const newUser = {
        id: uuidv4(),
        email,
        password,
        dailyCount: 0,         // Track daily messages sent
        lastReset: null        // Date of last reset
    };

    users.push(newUser);
    saveUsers(users);

    res.json({ success: true, userId: newUser.id });
};

// Login
exports.login = (req, res) => {
    const { email, password, deviceId } = req.body;
    let users = loadUsers();

    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const existingSession = activeSessions.find(s => s.userId === user.id);

    if (!existingSession) {
        const newSession = { userId: user.id, deviceId, token: uuidv4() };
        activeSessions.push(newSession);
        return res.json({ success: true, token: newSession.token, userId: user.id });
    }

    if (existingSession.deviceId === deviceId) {
        return res.json({ success: true, token: existingSession.token, userId: user.id });
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

// Export helpers so message controller can use them
exports.loadUsers = loadUsers;
exports.saveUsers = saveUsers;
