import React from "react";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import LogoutSharpIcon from "@mui/icons-material/LogoutSharp";
import StorefrontSharpIcon from "@mui/icons-material/StorefrontSharp";
import { assets } from "../assets/assets";

const Navbar = ({ setToken }) => {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: "rgba(249,250,251,0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        color: "text.primary",
      }}
    >
      <Toolbar sx={{ minHeight: 73, px: { xs: 2, sm: 3, lg: 4 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{ width: "100%" }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
             <Avatar
              variant="rounded"
              src={assets.logo}
              alt="Admin dashboard logo"
              sx={{
                width: 44,
                height: 44,
                bgcolor: "rgba(6,182,212,0.12)",
                borderRadius: 2.5,
              }}
            >
              <StorefrontSharpIcon />
            </Avatar> 
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Commerce Admin
              </Typography>
              <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.1 }}>
                Operations Hub
              </Typography>
            </Box>
          </Stack>

          <Button
            onClick={() => setToken("")}
            variant="contained"
            color="inherit"
            startIcon={<LogoutSharpIcon />}
            sx={{
              bgcolor: "primary.main",
              color: "common.white",
              borderRadius: 999,
              px: 2.25,
              py: 1,
              boxShadow: "none",
              "&:hover": {
                bgcolor: "primary.dark",
                boxShadow: "none",
              },
            }}
          >
            Logout
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
