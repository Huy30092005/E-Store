import axios from "axios";
import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LockPersonSharpIcon from "@mui/icons-material/LockPersonSharp";
import { backendUrl } from "../config";
import { toast } from "react-toastify";

const Login = ({ setToken }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await axios.post(backendUrl + "/api/user/admin", {
        email,
        password,
      });

      if (response.data.success) {
        setToken(response.data.token);
      } else {
        setErrorMessage(response.data.message || "Login failed.");
        toast.error(response.data.message);
      }
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        background:
          "radial-gradient(circle at top left, rgba(6,182,212,0.24), transparent 34%), linear-gradient(180deg, #F9FAFB 0%, #ECFEFF 100%)",
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 5,
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 32px 80px rgba(8, 145, 178, 0.12)",
        }}
      >
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={3}>
            <Box>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 3,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: "primary.main",
                    color: "common.white",
                  }}
                >
                  <LockPersonSharpIcon />
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Admin Access
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    Sign in to continue
                  </Typography>
                </Box>
              </Stack>

              <Typography color="text.secondary">
                Manage products, orders, and analytics from your Material UI admin workspace.
              </Typography>
            </Box>

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Box component="form" onSubmit={onSubmitHandler}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={isSubmitting}
                  sx={{ mt: 1, py: 1.25, borderRadius: 3, fontWeight: 700 }}
                >
                  {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "Login"}
                </Button>
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
