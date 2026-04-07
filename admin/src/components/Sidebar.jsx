import React from "react";
import { NavLink } from "react-router-dom";
import {
  Box,
  Chip,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import DashboardSharpIcon from "@mui/icons-material/DashboardSharp";
import AddBoxSharpIcon from "@mui/icons-material/AddBoxSharp";
import ViewListSharpIcon from "@mui/icons-material/ViewListSharp";
import LocalShippingSharpIcon from "@mui/icons-material/LocalShippingSharp";

const navItems = [
  { to: "/", label: "Dashboard", icon: <DashboardSharpIcon />, end: true },
  { to: "/add", label: "Add Items", icon: <AddBoxSharpIcon /> },
  { to: "/list", label: "List Items", icon: <ViewListSharpIcon /> },
  { to: "/orders", label: "Orders", icon: <LocalShippingSharpIcon /> },
];

const Sidebar = () => {
  return (
    <Box
      component="aside"
      sx={{
        width: { xs: "100%", md: 280 },
        flexShrink: 0,
        position: { md: "sticky" },
        top: { md: 73 },
        alignSelf: { md: "flex-start" },
        height: { md: "calc(100vh - 73px)" },
        p: { xs: 2, md: 2.5 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          height: "100%",
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(236,254,255,0.98) 0%, rgba(255,255,255,0.98) 100%)",
        }}
      >
        <Stack spacing={2.5} sx={{ p: 2.5 }}>
          <Box>
            <Chip
              label="Navigation"
              size="small"
              sx={{ mb: 1.5, bgcolor: "rgba(6,182,212,0.12)", color: "primary.main" }}
            />
            <Typography variant="h6" fontWeight={800}>
              Admin Console
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Switch between analytics, inventory, and fulfillment workflows.
            </Typography>
          </Box>

          <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                style={{ textDecoration: "none" }}
              >
                {({ isActive }) => (
                  <ListItemButton
                    sx={{
                      borderRadius: 3,
                      px: 1.5,
                      py: 1.2,
                      bgcolor: isActive ? "rgba(6,182,212,0.12)" : "transparent",
                      color: isActive ? "primary.main" : "text.primary",
                      "&:hover": {
                        bgcolor: isActive ? "rgba(6,182,212,0.18)" : "rgba(8,145,178,0.08)",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 40,
                        color: isActive ? "primary.main" : "text.secondary",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: isActive ? 700 : 600 }}
                    />
                  </ListItemButton>
                )}
              </NavLink>
            ))}
          </List>
        </Stack>
      </Paper>
    </Box>
  );
};

export default Sidebar;
