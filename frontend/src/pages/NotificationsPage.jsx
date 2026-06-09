import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Pagination,
  Skeleton,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import EventIcon from "@mui/icons-material/Event";
import FilterListIcon from "@mui/icons-material/FilterList";
import MarkEmailReadIcon from "@mui/icons-material/MarkEmailRead";
import CircleIcon from "@mui/icons-material/Circle";

import { getNotifications } from "../services/api";

const CONFIG = {
  placement: { color: "#ff6e40", icon: <WorkIcon />, label: "Placement" },
  result: { color: "#40c4ff", icon: <SchoolIcon />, label: "Result" },
  event: { color: "#69f0ae", icon: <EventIcon />, label: "Event" },
};

function readIdsFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("readNotifications") || "[]");
  } catch (e) {
    return [];
  }
}

function addToRead(id) {
  const ids = readIdsFromStorage();
  if (!ids.includes(id)) {
    ids.push(id);
    localStorage.setItem("readNotifications", JSON.stringify(ids));
  }
}

function getDurationLabel(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [readList, setReadList] = useState(readIdsFromStorage());

  const limit = 6;

  useEffect(() => {
    setLoading(true);
    setErr(null);

    getNotifications(page, limit, filter)
      .then((res) => {
        setItems(res.data.notifications);
        setTotalPages(res.data.pagination.totalPages);
      })
      .catch(() => {
        setErr("Could not retrieve notifications from service.");
      })
      .finally(() => setLoading(false));
  }, [page, filter]);

  const handleFilter = (_, val) => {
    if (val !== null) {
      setFilter(val);
      setPage(1);
    }
  };

  const markRead = (id) => {
    addToRead(id);
    setReadList([...readIdsFromStorage()]);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3, flexWrap: "wrap" }}>
        <FilterListIcon sx={{ color: "rgba(255,255,255,0.5)" }} />
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilter}
          size="small"
        >
          <ToggleButton value="all" sx={{ textTransform: "none", px: 2 }}>All</ToggleButton>
          <ToggleButton value="placement" sx={{ textTransform: "none", px: 2, color: "#ff6e40" }}>Placement</ToggleButton>
          <ToggleButton value="result" sx={{ textTransform: "none", px: 2, color: "#40c4ff" }}>Result</ToggleButton>
          <ToggleButton value="event" sx={{ textTransform: "none", px: 2, color: "#69f0ae" }}>Event</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading &&
        [1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2, borderRadius: 3 }} />
        ))}

      {!loading &&
        items.map((n) => {
          const isRead = readList.includes(n.id);
          const ui = CONFIG[n.type] || CONFIG.event;

          return (
            <Card
              key={n.id}
              sx={{
                mb: 2,
                opacity: isRead ? 0.65 : 1,
                borderLeft: `4px solid ${ui.color}`,
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                },
              }}
            >
              <CardContent sx={{ pb: "12px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Chip
                    icon={ui.icon}
                    label={ui.label}
                    size="small"
                    sx={{
                      bgcolor: `${ui.color}20`,
                      color: ui.color,
                      fontWeight: 600,
                      fontSize: 12,
                    }}
                  />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>
                      {getDurationLabel(n.timestamp)}
                    </Typography>
                    {!isRead && (
                      <Tooltip title="Mark as read">
                        <IconButton size="small" onClick={() => markRead(n.id)} sx={{ color: "#7c4dff" }}>
                          <MarkEmailReadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!isRead && <CircleIcon sx={{ fontSize: 8, color: "#7c4dff" }} />}
                  </Box>
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5, lineHeight: 1.3 }}>
                  {n.message}
                </Typography>

                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.3)", display: "block" }}>
                  ID: {n.id}
                </Typography>
              </CardContent>
            </Card>
          );
        })}

      {!loading && items.length === 0 && (
        <Alert severity="info">No new notifications in this category.</Alert>
      )}

      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
