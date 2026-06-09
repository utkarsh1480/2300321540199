require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");

const notificationRoutes = require("./routes/notifications");

const app = express();
const PORT = process.env.PORT || 3001;

// logging middleware (mandatory — must be first middleware)
app.use(logger.middleware());

// other middleware
app.use(cors());
app.use(express.json());

// routes
app.use("/api/notifications", notificationRoutes);

// health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// start server
app.listen(PORT, () => {
  logger.info(`Backend running at http://localhost:${PORT}`);
  logger.info("Routes: GET /api/notifications, GET /api/notifications/priority, GET /api/notifications/stats");
});
