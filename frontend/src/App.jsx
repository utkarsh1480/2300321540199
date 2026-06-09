import { useState, useEffect, useCallback } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Tabs,
  Tab,
  Box,
  Chip,
  Badge,
  IconButton,
  Tooltip,
  useMediaQuery,
  CssBaseline,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";

import NotificationsPage from "./pages/NotificationsPage";
import PriorityPage from "./pages/PriorityPage";
import { getStats } from "./services/api";

// dark theme
const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#7c4dff" },
    secondary: { main: "#ff6e40" },
    background: {
      default: "#0a0e1a",
      paper: "#111827",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(124, 77, 255, 0.15)",
        },
      },
    },
  },
});

// helper to count unread notifications
function getUnreadCount(total) {
  try {
    const readIds = JSON.parse(localStorage.getItem("readNotifications") || "[]");
    return Math.max(0, total - readIds.length);
  } catch {
    return total;
  }
}

function App() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // refresh unread count
  const refreshUnread = useCallback(() => {
    if (stats) setUnreadCount(getUnreadCount(stats.total));
  }, [stats]);

  useEffect(() => {
    getStats()
      .then((res) => {
        setStats(res.data);
        setUnreadCount(getUnreadCount(res.data.total));
      })
      .catch(() => {});
  }, []);

  // listen for localStorage changes (when user marks notifications as read)
  useEffect(() => {
    const interval = setInterval(refreshUnread, 2000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Top Navbar */}
      <AppBar
        position="sticky"
        sx={{
          background: "linear-gradient(135deg, #0a0e1a 0%, #1a1f36 100%)",
          borderBottom: "1px solid rgba(124, 77, 255, 0.2)",
          boxShadow: "0 4px 30px rgba(124, 77, 255, 0.1)",
        }}
      >
        <Toolbar>
          <NotificationsIcon sx={{ mr: 1.5, color: "#7c4dff" }} />
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: "-0.5px" }}
          >
            Campus Notify
          </Typography>

          {stats && !isMobile && (
            <Box sx={{ display: "flex", gap: 1, mr: 2 }}>
              <Chip label={`${stats.total} Total`} size="small" color="primary" variant="outlined" />
              <Chip label={`${stats.by_type?.placement || 0} Placement`} size="small" sx={{ color: "#ff6e40", borderColor: "#ff6e40" }} variant="outlined" />
            </Box>
          )}

          {/* 🔔 Unread notification badge */}
          <Tooltip title={`${unreadCount} unread notifications`}>
            <IconButton
              sx={{ color: unreadCount > 0 ? "#7c4dff" : "rgba(255,255,255,0.4)" }}
              onClick={() => { setTab(0); }}
            >
              <Badge
                badgeContent={unreadCount}
                color="secondary"
                max={99}
                sx={{
                  "& .MuiBadge-badge": {
                    fontWeight: 700,
                    fontSize: 11,
                  },
                }}
              >
                {unreadCount > 0 ? <NotificationsActiveIcon /> : <NotificationsIcon />}
              </Badge>
            </IconButton>
          </Tooltip>
        </Toolbar>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? "fullWidth" : "standard"}
          sx={{ px: 2 }}
          slotProps={{
            indicator: {
              style: { background: "#7c4dff", height: 3, borderRadius: 2 },
            },
          }}
        >
          <Tab
            icon={<NotificationsIcon />}
            iconPosition="start"
            label="Notifications"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
          <Tab
            icon={<PriorityHighIcon />}
            iconPosition="start"
            label="Priority Feed"
            sx={{ textTransform: "none", fontWeight: 600 }}
          />
        </Tabs>
      </AppBar>

      {/* Page Content */}
      <Container maxWidth="md" sx={{ py: 3 }}>
        {tab === 0 && <NotificationsPage />}
        {tab === 1 && <PriorityPage />}
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          textAlign: "center",
          py: 3,
          color: "rgba(255,255,255,0.3)",
          fontSize: 13,
        }}
      >
        AffordMed Campus Hiring Evaluation • Built with React + Material UI
      </Box>
    </ThemeProvider>
  );
}

export default App;
