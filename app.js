const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const path = require("path");

const app = express();
app.use(cors({
  origin: "*", // OR restrict to your IP or domain
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/auth", authRoutes);
app.use("/", messageRoutes);

app.listen(process.env.PORT || 3000, '0.0.0.0', () =>
  console.log(`✅ Backend running on port ${process.env.PORT || 3000}`)
);
