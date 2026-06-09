const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

const fetchNotifications = require("../services/fetchNotifications");
const { getTopPriority, calculateScore } = require("../services/priorityEngine");

// GET /api/notifications
router.get("/", async (req, res) => {
  try {
    logger.info("request for notifications list", { query: req.query });
    let list = await fetchNotifications();
    const { type, page = 1, limit = 10 } = req.query;

    if (type && type !== "all") {
      list = list.filter((n) => n.type === type.toLowerCase());
      logger.info(`filtered by type: ${type}`);
    }

    // append scores
    list = list.map((n) => ({
      ...n,
      score: calculateScore(n),
    }));

    // newest first
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const total = list.length;
    const p = Math.max(1, parseInt(page));
    const pageSize = Math.max(1, Math.min(50, parseInt(limit)));
    const totalPages = Math.ceil(total / pageSize);
    
    const start = (p - 1) * pageSize;
    const sliced = list.slice(start, start + pageSize);

    logger.info(`sending page ${p}/${totalPages}`);

    res.json({
      success: true,
      data: {
        notifications: sliced,
        pagination: {
          page: p,
          limit: pageSize,
          total,
          totalPages,
        },
      },
    });
  } catch (err) {
    logger.error("error listing notifications: " + err.message);
    res.status(500).json({
      success: false,
      error: { message: "Internal server error" },
    });
  }
});

// GET /api/notifications/priority
router.get("/priority", async (req, res) => {
  try {
    logger.info("request for priority feed", { query: req.query });
    const list = await fetchNotifications();
    const limitNum = Math.max(1, Math.min(50, parseInt(req.query.top || "10")));

    const topItems = getTopPriority(list, limitNum);

    res.json({
      success: true,
      data: {
        notifications: topItems,
        algorithm: {
          formula: "score = (typeWeight * 0.6) + (recency * 0.3) + (engagement * 0.1)",
          typeWeights: { placement: 1.0, result: 0.7, event: 0.4 },
          recencyHalfLife: "24 hours",
        },
        total_processed: list.length,
        top_k: limitNum,
      },
    });
  } catch (err) {
    logger.error("error processing priority feed: " + err.message);
    res.status(500).json({
      success: false,
      error: { message: "Internal server error" },
    });
  }
});

// GET /api/notifications/stats
router.get("/stats", async (req, res) => {
  try {
    logger.info("request for stats");
    const list = await fetchNotifications();

    const stats = {
      total: list.length,
      by_type: {
        placement: list.filter((n) => n.type === "placement").length,
        result: list.filter((n) => n.type === "result").length,
        event: list.filter((n) => n.type === "event").length,
      },
    };

    logger.info("stats ready");
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error("error calculating stats: " + err.message);
    res.status(500).json({
      success: false,
      error: { message: "Internal server error" },
    });
  }
});

module.exports = router;
