import express from "express";
import {
  loginUser,
  registerUser,
  adminLogin,
  googleAuth,
  getCurrentUser,
  listUsers,
} from "../controllers/userController.js";
import authUser from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";
import passport from "../config/passport.js";
import jwt from "jsonwebtoken";

const userRouter = express.Router();
const defaultFrontendURL = "http://localhost:5173";

const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const getOrigin = (value) => {
  try {
    return new URL(trimTrailingSlash(value)).origin;
  } catch {
    return null;
  }
};

const getConfiguredFrontendURL = () =>
  trimTrailingSlash(process.env.FRONTEND_URL || defaultFrontendURL);

const getAllowedFrontendOrigins = () => {
  const origins = [
    getOrigin(getConfiguredFrontendURL()),
    ...String(process.env.FRONTEND_URLS || "")
      .split(",")
      .map((url) => getOrigin(url.trim())),
    "http://localhost:5173",
  ].filter(Boolean);

  return new Set(origins);
};

const getSafeFrontendURL = (value) => {
  if (!value) {
    return getConfiguredFrontendURL();
  }

  try {
    const url = new URL(value);
    if (getAllowedFrontendOrigins().has(url.origin)) {
      return url.origin;
    }
  } catch {
    return getConfiguredFrontendURL();
  }

  return getConfiguredFrontendURL();
};

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/admin", adminLogin);
userRouter.post("/google-auth", googleAuth);
userRouter.get("/me", authUser, getCurrentUser);
userRouter.get("/list", adminAuth, listUsers);

userRouter.get(
  "/auth/google",
  (req, res, next) => {
    const frontendURL = getSafeFrontendURL(req.query.redirect);
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state: Buffer.from(JSON.stringify({ frontendURL })).toString("base64url"),
    })(req, res, next);
  }
);

userRouter.get(
  "/auth/google/callback",
  (req, res, next) => {
    const frontendURL = getFrontendURLFromState(req.query.state);
    passport.authenticate("google", {
      failureRedirect: `${frontendURL}/login?error=oauth_failed`,
      session: false,
    })(req, res, next);
  },
  (req, res) => {
    const token = jwt.sign({ id: req.user.id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    const frontendURL = getFrontendURLFromState(req.query.state);
    res.redirect(`${frontendURL}/oauth-callback?token=${token}`);
  }
);

const getFrontendURLFromState = (state) => {
  if (!state) {
    return getConfiguredFrontendURL();
  }

  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    return getSafeFrontendURL(parsed.frontendURL);
  } catch {
    return getConfiguredFrontendURL();
  }
};

export default userRouter;
