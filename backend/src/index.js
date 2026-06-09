require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require("./utils/logger");

const notificationsRouter = require("./routes/notifications");

const app = express();
const port = process.env.PORT || 3001;

// Log request info
app.use(logger.middleware());

app.use(cors());
app.use(express.json());

app.use("/api/notifications", notificationsRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "alive", uptime: process.uptime() });
});

app.listen(port, () => {
  logger.info(`Server listening on port ${port}`);
});
