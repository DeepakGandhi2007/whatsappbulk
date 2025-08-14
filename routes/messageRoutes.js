const express = require("express");
const multer = require("multer");
const { sendMessage } = require("../controllers/messageController");

const router = express.Router();

// Store file in memory, not disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/whatsapp/send/:userId", upload.single("image"), (req, res) => {
  sendMessage(req.params.userId, req, res);
});

module.exports = router;
