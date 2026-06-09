const axios = require("axios");
const logger = require("../utils/logger");

let cachedData = null;
let lastFetched = 0;
const CACHE_DURATION = 60 * 1000; 

// Initial mock data that mirrors the API response structure
const FALLBACK_LIST = [
  {
    ID: "d146095a-0d86-4a34-9e69-3900a14576bc",
    Type: "Result",
    Message: "mid-sem",
    Timestamp: "2026-04-22 17:51:30",
  },
  {
    ID: "b283218f-ea5a-4b7c-93a9-1f2f240d64b0",
    Type: "Placement",
    Message: "CSX Corporation hiring",
    Timestamp: "2026-04-22 17:51:18",
  },
  {
    ID: "81589ada-0ad3-4f77-9554-f52fb558e09d",
    Type: "Event",
    Message: "farewell",
    Timestamp: "2026-04-22 17:51:06",
  },
  {
    ID: "0005513a-142b-4bbc-8678-eefec65e1ede",
    Type: "Result",
    Message: "mid-sem",
    Timestamp: "2026-04-22 17:50:54",
  },
  {
    ID: "ea836726-c25e-4f21-a72f-544a6af8a37f",
    Type: "Result",
    Message: "project-review",
    Timestamp: "2026-04-22 17:50:42",
  },
  {
    ID: "003cb427-8fc6-47f7-bb00-be228f6b0d2c",
    Type: "Result",
    Message: "external",
    Timestamp: "2026-04-22 17:50:30",
  },
  {
    ID: "a1b2c3d4-1111-2222-3333-444455556666",
    Type: "Placement",
    Message: "Google on-campus hiring drive",
    Timestamp: new Date(Date.now() - 2 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-2222-3333-4444-555566667777",
    Type: "Placement",
    Message: "Amazon SDE walk-in interview",
    Timestamp: new Date(Date.now() - 1 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-3333-4444-5555-666677778888",
    Type: "Placement",
    Message: "Microsoft internship program",
    Timestamp: new Date(Date.now() - 5 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-4444-5555-6666-777788889999",
    Type: "Event",
    Message: "TechFest hackathon registration",
    Timestamp: new Date(Date.now() - 3 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-5555-6666-7777-888899990000",
    Type: "Result",
    Message: "semester-6 end-term results",
    Timestamp: new Date(Date.now() - 6 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-6666-7777-8888-999900001111",
    Type: "Placement",
    Message: "JP Morgan software engineer role",
    Timestamp: new Date(Date.now() - 0.5 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-7777-8888-9999-000011112222",
    Type: "Event",
    Message: "AWS cloud computing workshop",
    Timestamp: new Date(Date.now() - 10 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-8888-9999-0000-111122223333",
    Type: "Result",
    Message: "GATE 2026 score cards available",
    Timestamp: new Date(Date.now() - 8 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-9999-0000-1111-222233334444",
    Type: "Event",
    Message: "coding contest AlgoRhythm weekly",
    Timestamp: new Date(Date.now() - 4 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-0000-1111-2222-333344445555",
    Type: "Placement",
    Message: "TCS Digital campus hiring",
    Timestamp: new Date(Date.now() - 14 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-aaaa-bbbb-cccc-ddddeeee0001",
    Type: "Event",
    Message: "cultural festival Crescendo 2026",
    Timestamp: new Date(Date.now() - 28 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-aaaa-bbbb-cccc-ddddeeee0002",
    Type: "Result",
    Message: "scholarship results merit-cum-means",
    Timestamp: new Date(Date.now() - 22 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-aaaa-bbbb-cccc-ddddeeee0003",
    Type: "Placement",
    Message: "Deloitte analyst campus drive",
    Timestamp: new Date(Date.now() - 20 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
  {
    ID: "a1b2c3d4-aaaa-bbbb-cccc-ddddeeee0004",
    Type: "Event",
    Message: "blood donation camp NSS",
    Timestamp: new Date(Date.now() - 7 * 3600000).toISOString().replace("T", " ").substring(0, 19),
  },
];

// Normalize backend field formats to consistent camelCase
function parseItem(item) {
  return {
    id: item.ID || item.id,
    type: (item.Type || item.type || item.notification_type || "Event").toLowerCase(),
    message: item.Message || item.message || item.title || "",
    timestamp: item.Timestamp || item.timestamp || item.created_at || new Date().toISOString(),
  };
}

async function fetchNotifications() {
  const now = Date.now();
  if (cachedData && now - lastFetched < CACHE_DURATION) {
    logger.debug("hit cache for notifications");
    return cachedData;
  }

  const url = process.env.API_URL;
  const token = process.env.AUTH_TOKEN;

  try {
    const opts = { headers: { "Content-Type": "application/json" } };
    if (token) {
      opts.headers["Authorization"] = `Bearer ${token}`;
    }

    logger.info("pulling from endpoint: " + url);
    const response = await axios.get(url, { ...opts, timeout: 8000 });

    let rawList;
    if (Array.isArray(response.data)) {
      rawList = response.data;
    } else if (Array.isArray(response.data?.notifications)) {
      rawList = response.data.notifications;
    } else if (Array.isArray(response.data?.data)) {
      rawList = response.data.data;
    } else {
      throw new Error("Format not supported");
    }

    const cleanList = rawList.map(parseItem);
    logger.info(`received ${cleanList.length} items from endpoint`);

    cachedData = cleanList;
    lastFetched = now;
    return cleanList;
  } catch (err) {
    logger.warn(`API request failed: ${err.message}. Using backup local list.`);
    const backupList = FALLBACK_LIST.map(parseItem);
    cachedData = backupList;
    lastFetched = now;
    return backupList;
  }
}

module.exports = fetchNotifications;
