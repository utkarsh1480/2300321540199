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

const TYPE_CONFIG = {
  placement: { color: "#ff6e40", icon: <WorkIcon fontSize="small" /> },
  result: { color: "#40c4ff", icon: <SchoolIcon fontSize="small" /> },
  event: { color: "#69f0ae", icon: <EventIcon fontSize="small" /> },
};

// medal colors for top 3
const MEDAL = ["#ffd700", "#c0c0c0", "#cd7f32"];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "< 1h ago";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function PriorityPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    getPriorityNotifications(10)
      .then((res) => {
        setNotifications(res.data.notifications);
        setMeta(res.data);
      })
      .catch(() => setError("Could not load priority feed. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const maxScore = notifications.length > 0 ? notifications[0].score : 1;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <TrendingUpIcon sx={{ color: "#7c4dff" }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Top 10 Priority Notifications
        </Typography>
      </Box>

      {meta && (
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)", mb: 3, display: "block" }}>
          Processed {meta.total_processed} notifications • Scored using:{" "}
          {meta.algorithm?.formula}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading &&
        [1, 2, 3, 4].map((i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={100}
            sx={{ mb: 2, borderRadius: 3 }}
          />
        ))}

      {!loading &&
        notifications.map((n, index) => {
          const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.event;
          const barWidth = (n.score / maxScore) * 100;

          return (
            <Card
              key={n.id}
              sx={{
                mb: 2,
                borderLeft: `4px solid ${cfg.color}`,
                position: "relative",
                overflow: "visible",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 25px rgba(0,0,0,0.3)",
                },
              }}
            >
              {/* Rank badge for top 3 */}
              {index < 3 && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -10,
                    left: -10,
                    bgcolor: MEDAL[index],
                    color: "#000",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    boxShadow: `0 2px 8px ${MEDAL[index]}80`,
                  }}
                >
                  {index + 1}
                </Box>
              )}

              <CardContent sx={{ pb: "12px !important" }}>
                {/* Top row */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Chip
                      icon={cfg.icon}
                      label={n.type}
                      size="small"
                      sx={{
                        bgcolor: `${cfg.color}20`,
                        color: cfg.color,
                        fontWeight: 600,
                        fontSize: 12,
                        textTransform: "capitalize",
                      }}
                    />
                    {index < 3 && (
                      <EmojiEventsIcon
                        sx={{ fontSize: 18, color: MEDAL[index] }}
                      />
                    )}
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

                {/* Message */}
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                  #{index + 1} {n.message}
                </Typography>

                {/* Score bar */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={barWidth}
                    sx={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
                      bgcolor: "rgba(255,255,255,0.05)",
                      "& .MuiLinearProgress-bar": {
                        borderRadius: 3,
                        background: `linear-gradient(90deg, ${cfg.color}, #7c4dff)`,
                      },
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{ color: "rgba(255,255,255,0.35)", minWidth: 50 }}
                  >
                    {timeAgo(n.timestamp)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}

      {/* Algorithm explanation card */}
      {meta && !loading && (
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
              <strong>Formula:</strong> score = (typeWeight × 0.6) + (recency × 0.3) + (engagement × 0.1)
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
