import jwt from "jsonwebtoken";

const getTokenFromHeaders = (headers) => {
  const bearer = headers.authorization;
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  return headers.token;
};

const REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

const adminAuth = async (req, res, next) => {
  try {
    const token = getTokenFromHeaders(req.headers);
    if (!token) {
      return res.json({ success: false, message: "Not authorized!" });
    }

    const tokenDecoded = jwt.verify(token, process.env.JWT_SECRET);
    if (tokenDecoded.email !== process.env.ADMIN_EMAIL) {
      return res.json({ success: false, message: "Not authorized!" });
    }

    // Refresh token if it's about to expire in less than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (tokenDecoded.exp && tokenDecoded.exp - now < REFRESH_THRESHOLD) {
      const newToken = jwt.sign({ email: tokenDecoded.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.setHeader('x-refresh-token', newToken);
    }

    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default adminAuth;
