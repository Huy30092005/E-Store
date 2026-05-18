import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const getTokenFromHeaders = (headers) => {
  const bearer = headers.authorization;
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  return headers.token;
};

const REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

const maybeRefreshAdminToken = (res, tokenDecoded) => {
  const now = Math.floor(Date.now() / 1000);
  if (!tokenDecoded.exp || tokenDecoded.exp - now >= REFRESH_THRESHOLD) {
    return;
  }

  const payload = tokenDecoded.id
    ? { id: tokenDecoded.id, role: "admin" }
    : { email: tokenDecoded.email, role: "admin" };

  const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  res.setHeader("x-refresh-token", newToken);
};

const adminAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return res.json({ success: false, message: "Not authorized!" });
    }

    const tokenDecoded = jwt.verify(token, process.env.JWT_SECRET);

    if (tokenDecoded.email && tokenDecoded.email === process.env.ADMIN_EMAIL) {
      req.admin = { type: "env", email: tokenDecoded.email };
      maybeRefreshAdminToken(res, tokenDecoded);
      return next();
    }

    if (tokenDecoded.id && tokenDecoded.role === "admin") {
      const adminUser = await userModel
        .findById(tokenDecoded.id)
        .select("_id name email role status");

      if (!adminUser || adminUser.role !== "admin" || adminUser.status === "blocked") {
        return res.json({ success: false, message: "Not authorized!" });
      }

      req.admin = {
        type: "user",
        userId: String(adminUser._id),
        email: adminUser.email,
      };
      maybeRefreshAdminToken(res, tokenDecoded);
      return next();
    }

    return res.json({ success: false, message: "Not authorized!" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default adminAuth;
