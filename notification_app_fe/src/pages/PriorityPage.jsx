import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Skeleton,
  Alert,
  LinearProgress,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import WorkIcon from "@mui/icons-material/Work";
import SchoolIcon from "@mui/icons-material/School";
import EventIcon from "@mui/icons-material/Event";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";

import { getPriorityNotifications } from "../services/api";

const CONFIG = {
  placement: { color: "#ff6e40", icon: <WorkIcon fontSize="small" /> },
  result: { color: "#40c4ff", icon: <SchoolIcon fontSize="small" /> },
  event: { color: "#69f0ae", icon: <EventIcon fontSize="small" /> },
};

const MEDAL_COLORS = ["#ffd700", "#c0c0c0", "#cd7f32"];

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "< 1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PriorityPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getPriorityNotifications(10)
      .then((res) => {
        setItems(res.data.notifications);
        setInfo(res.data);
      })
      .catch(() => setErr("Failed to load ranked feed."))
      .finally(() => setLoading(false));
  }, []);

  const maxVal = items.length > 0 ? items[0].score : 1;

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <TrendingUpIcon sx={{ color: "#7c4dff" }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Priority Inbox (Top 10)
        </Typography>
      </Box>

      {info && (
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", mb: 3, display: "block" }}>
          Processed {info.total_processed} items • Scored using: {info.algorithm?.formula}
        </Typography>
      )}

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      {loading &&
        [1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={100} sx={{ mb: 2, borderRadius: 3 }} />
        ))}

      {!loading &&
        items.map((n, idx) => {
          const ui = CONFIG[n.type] || CONFIG.event;
          const pct = (n.score / maxVal) * 100;

          return (
            <Card
              key={n.id}
              sx={{
                mb: 2,
                borderLeft: `4px solid ${ui.color}`,
                position: "relative",
                overflow: "visible",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                },
              }}
            >
              {idx < 3 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -10,
                    left: -10,
                    bgcolor: MEDAL_COLORS[idx],
                    color: "#000",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    boxShadow: `0 2px 8px ${MEDAL_COLORS[idx]}80`,
                  }}
                >
                  {idx + 1}
                </Box>
              )}

              <CardContent sx={{ pb: "12px !important" }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      icon={ui.icon}
                      label={n.type}
                      size="small"
                      sx={{
                        bgcolor: `${ui.color}20`,
                        color: ui.color,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "capitalize",
                      }}
                    />
                    {idx < 3 && <EmojiEventsIcon sx={{ fontSize: 18, color: MEDAL_COLORS[idx] }} />}
                  </Box>
                  <Chip
                    label={`Score: ${n.score.toFixed(4)}`}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: 12,
                      color: "#7c4dff",
                      borderColor: "rgba(124,77,255,0.3)",
                    }}
                  />
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  #{idx + 1} {n.message}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.05)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${ui.color}, #7c4dff)`,
                      },
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.35)", minWidth: 50 }}>
                    {formatTimeAgo(n.timestamp)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}

      {info && !loading && (
        <Card
          sx={{
            mt: 3,
            bgcolor: "rgba(124,77,255,0.05)",
            border: "1px dashed rgba(124,77,255,0.3)",
          }}
        >
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#7c4dff" }}>
              🧮 How Priority Scoring Works
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.8 }}>
              <strong>Formula:</strong> score = (typeWeight * 0.6) + (recency * 0.3) + (engagement * 0.1)
              <br />
              <strong>Type Weights:</strong> Placement = 1.0, Result = 0.7, Event = 0.4
              <br />
              <strong>Recency:</strong> Exponential decay — score halves every 24 hours
              <br />
              <strong>Data Structure:</strong> Min Heap for O(N log K) top-K extraction
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
