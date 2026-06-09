const express = require("express");
const router = express.Router();
const logger = require("../utils/logger");

const fetchNotifications = require("../services/fetchNotifications");
const { getTopPriority, calculateScore } = require("../services/priorityEngine");

/**
 * GET /api/notifications
 * Returns all notifications with optional filtering and pagination.
 *
 * Query params:
 *   type  - filter by type (placement | result | event)
 *   page  - page number (default 1)
 *   limit - items per page (default 10)
 */
router.get("/", async (req, res) => {
  try {
    logger.info("GET /api/notifications", { query: req.query });
    let notifications = await fetchNotifications();
    const { type, page = 1, limit = 10 } = req.query;

    // filter by type
    if (type && type !== "all") {
      notifications = notifications.filter(
        (n) => n.type === type.toLowerCase()
      );
      logger.info(`Filtered by type="${type}", ${notifications.length} results`);
    }

    // add score to each notification
    notifications = notifications.map((n) => ({
      ...n,
      score: calculateScore(n),
    }));

    // sort by timestamp (newest first)
    notifications.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // pagination
    const total = notifications.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
    const totalPages = Math.ceil(total / limitNum);
    const start = (pageNum - 1) * limitNum;
    const paged = notifications.slice(start, start + limitNum);

    logger.info(`Returning page ${pageNum}/${totalPages}, ${paged.length} items`);

    res.json({
      success: true,
      data: {
        notifications: paged,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      },
    });
  } catch (err) {
    logger.error("Error fetching notifications", { error: err.message });
    res.status(500).json({
      success: false,
      error: { message: "Failed to fetch notifications" },
    });
  }
});

/**
 * GET /api/notifications/priority
 * Returns top N notifications ranked by priority score.
 *
 * Query params:
 *   top - number of top items to return (default 10)
 */
router.get("/priority", async (req, res) => {
  try {
    logger.info("GET /api/notifications/priority", { query: req.query });
    const notifications = await fetchNotifications();
    const topN = Math.max(1, Math.min(50, parseInt(req.query.top || "10")));

    const topNotifications = getTopPriority(notifications, topN);

    res.json({
      success: true,
      data: {
        notifications: topNotifications,
        algorithm: {
          formula: "score = (typeWeight × 0.6) + (recency × 0.3) + (engagement × 0.1)",
          typeWeights: { placement: 1.0, result: 0.7, event: 0.4 },
          recencyHalfLife: "24 hours",
        },
        total_processed: notifications.length,
        top_k: topN,
      },
    });
  } catch (err) {
    logger.error("Error computing priority", { error: err.message });
    res.status(500).json({
      success: false,
      error: { message: "Failed to compute priority rankings" },
    });
  }
});

/**
 * GET /api/notifications/stats
 * Returns summary counts.
 */
router.get("/stats", async (req, res) => {
  try {
    logger.info("GET /api/notifications/stats");
    const notifications = await fetchNotifications();

    const stats = {
      total: notifications.length,
      by_type: {
        placement: notifications.filter((n) => n.type === "placement").length,
        result: notifications.filter((n) => n.type === "result").length,
        event: notifications.filter((n) => n.type === "event").length,
      },
    };

    logger.info("Stats computed", stats);
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error("Error getting stats", { error: err.message });
    res.status(500).json({
      success: false,
      error: { message: "Failed to get stats" },
    });
  }
});

module.exports = router;
