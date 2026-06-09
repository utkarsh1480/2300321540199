import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3001/api",
});

// Fetch all notifications with optional filters
export async function getNotifications(page = 1, limit = 10, type = "all") {
  const params = { page, limit };
  if (type && type !== "all") params.type = type;
  const res = await API.get("/notifications", { params });
  return res.data;
}

// Fetch top priority notifications
export async function getPriorityNotifications(top = 10) {
  const res = await API.get("/notifications/priority", { params: { top } });
  return res.data;
}

// Fetch stats
export async function getStats() {
  const res = await API.get("/notifications/stats");
  return res.data;
}
