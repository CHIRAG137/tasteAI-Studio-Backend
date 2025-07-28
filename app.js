const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const botRoutes = require("./routes/botRoutes");
const chatBotRoutes = require("./routes/chatBotRoutes");
const publicBotRoutes = require("./routes/publicBotRoutes");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: ["http://localhost:8080", "https://tastebot-studio.onrender.com"],
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

app.use("/api/bots", botRoutes);
app.use("/api/public", publicBotRoutes);
app.use("/api/", chatBotRoutes);
app.get("/widget.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public/widget.js"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
