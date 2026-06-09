const MinHeap = require("../utils/MinHeap");
const logger = require("../utils/logger");

const WEIGHTS = {
  placement: 1.0,
  result: 0.7,
  event: 0.4,
};

// Halves score every 24 hours (exponential decay)
function getRecency(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.max(0, diff / (3600000));
  return Math.exp(-0.693 * hours / 24);
}

function calculateScore(item) {
  const type = (item.type || "event").toLowerCase();
  const typeScore = (WEIGHTS[type] || 0.4) * 0.6;
  const recencyScore = getRecency(item.timestamp) * 0.3;

  // slight boost for keyword matches
  let boost = 0;
  const msg = (item.message || "").toLowerCase();
  if (msg.includes("hiring") || msg.includes("drive")) boost += 0.04;
  if (msg.includes("walk-in") || msg.includes("interview")) boost += 0.03;
  if (msg.includes("result") || msg.includes("score")) boost += 0.02;

  return parseFloat((typeScore + recencyScore + boost).toFixed(4));
}

function getTopPriority(list, count = 10) {
  logger.info(`Ranking top ${count} from ${list.length} items`);
  const heap = new MinHeap(count);

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const score = calculateScore(item);
    heap.insert({ ...item, score });
  }

  const sorted = heap.getSorted();
  logger.info(`Priority feed created with ${sorted.length} items`);
  return sorted;
}

module.exports = { calculateScore, getTopPriority, getRecency, WEIGHTS };
