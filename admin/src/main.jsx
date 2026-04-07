import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0891B2",
      dark: "#0E7490",
      light: "#06B6D4",
      contrastText: "#F9FAFB",
    },
    secondary: {
      main: "#06B6D4",
      dark: "#0891B2",
      light: "#67E8F9",
      contrastText: "#0F172A",
    },
    success: {
      main: "#06B6D4",
      dark: "#0891B2",
      light: "#67E8F9",
    },
    background: {
      default: "#F9FAFB",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0F172A",
      secondary: "#334155",
    },
    divider: "#CFFAFE",
    info: {
      main: "#06B6D4",
    },
    warning: {
      main: "#06B6D4",
      dark: "#0891B2",
      light: "#67E8F9",
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: "Outfit, sans-serif",
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>
);
