const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const { loadUsers, saveUsers } = require("./authController"); // Import helpers

// Cloudinary config
cloudinary.config({
    cloud_name: "dmmpvcz2a",
    api_key: "161231364622252",
    api_secret: "BnZoxrVnKzBc6n6j1KOqltHIs34"
});

exports.sendMessage = async (userId, req, res) => {
    try {
        const { numbers, message } = req.body;

        if (!numbers || !message) {
            return res.status(400).json({
                success: false,
                message: "Numbers and message are required",
            });
        }

        let users = loadUsers();
        let user = users.find(u => u.id === userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Reset daily count if new day
        const today = new Date().toISOString().split("T")[0];
        if (user.lastReset !== today) {
            user.dailyCount = 0;
            user.lastReset = today;
        }

        const DAILY_LIMIT = 5000;

        const numberList = numbers
            .split(",")
            .map(n => n.trim())
            .filter(n => n.length > 0);

        if (numberList.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No valid numbers found",
            });
        }

        // Check if sending will exceed limit
        if (user.dailyCount + numberList.length > DAILY_LIMIT) {
            return res.status(403).json({
                success: false,
                message: `Daily limit reached. You can send ${DAILY_LIMIT - user.dailyCount} more messages today.`,
            });
        }

        // Upload to Cloudinary directly from memory buffer
        let imageUrl = null;
        if (req.file && req.file.buffer) {
            imageUrl = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "whatsapp_uploads", resource_type: "image" },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result.secure_url);
                    }
                );
                streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
            });
        }

        // DealSMS API credentials
        const accessToken = "6899e4303322f";
        const sendMessageUrl = "https://dealsms.in/api/send";

        let results = [];

        // Send messages
        for (let num of numberList) {
            const payload = {
                number: num,
                type: imageUrl ? "image" : "text",
                message: message,
                media_url: imageUrl || undefined,
                instance_id: "689B3F66E5B88",
                access_token: accessToken,
            };

            try {
                const response = await axios.get(sendMessageUrl, { params: payload });
                results.push({ number: num, status: "sent", response: response.data });
            } catch (err) {
                results.push({ number: num, status: "failed", error: err.message });
            }
        }

        // Update daily count
        user.dailyCount += numberList.length;
        saveUsers(users);

        return res.json({
            success: true,
            total: numberList.length,
            sent: results.filter(r => r.status === "sent").length,
            failed: results.filter(r => r.status === "failed").length,
            results,
        });

    } catch (err) {
        console.error("Error in sendMessage:", err.message);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};
