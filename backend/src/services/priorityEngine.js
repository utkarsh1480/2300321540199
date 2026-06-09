const MinHeap = require("../utils/MinHeap");
const logger = require("../utils/logger");

// --- Priority Weights ---
// Placement > Result > Event (as specified in evaluation)
const TYPE_WEIGHT = {
  placement: 1.0,
  result: 0.7,
  event: 0.4,
};

/**
 * Calculate how "fresh" a notification is.
 * Uses exponential decay — score halves every 24 hours.
 *
 *   0 hours  → 1.00
 *   12 hours → 0.71
 *   24 hours → 0.50
 *   48 hours → 0.25
 */
function recencyScore(timestamp) {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const ageHours = Math.max(0, ageMs / (1000 * 60 * 60));
  return Math.exp(-0.693 * ageHours / 24);
}

/**
 * Calculate the final priority score for one notification.
 *
 * Formula:
 *   score = (typeWeight × 0.6) + (recency × 0.3) + (engagement × 0.1)
 */
function calculateScore(notification) {
  const type = (notification.type || "event").toLowerCase();
  const typeScore = (TYPE_WEIGHT[type] || 0.4) * 0.6;
  const recency = recencyScore(notification.timestamp) * 0.3;

  // small engagement bonus based on keywords
  let engagement = 0;
  const msgLower = (notification.message || "").toLowerCase();
  if (msgLower.includes("hiring") || msgLower.includes("drive")) engagement += 0.04;
  if (msgLower.includes("walk-in") || msgLower.includes("interview")) engagement += 0.03;
  if (msgLower.includes("result") || msgLower.includes("score")) engagement += 0.02;

  const score = parseFloat((typeScore + recency + engagement).toFixed(4));
  return score;
}

/**
 * Get the top N notifications by priority using a MinHeap.
 *
 * Steps:
 * 1. Score every notification
 * 2. Push each into a MinHeap of size N
 * 3. Extract sorted results (highest first)
 */
function getTopPriority(notifications, topN = 10) {
  logger.info(`Computing top ${topN} from ${notifications.length} notifications`);

  const heap = new MinHeap(topN);

  for (const n of notifications) {
    const score = calculateScore(n);
    heap.insert({ ...n, score });
  }

  const result = heap.getSorted();
  logger.info(`Top priority result: ${result.length} items`, {
    top_score: result[0]?.score,
    bottom_score: result[result.length - 1]?.score,
  });

  return result;
}

module.exports = { calculateScore, getTopPriority, recencyScore, TYPE_WEIGHT };
