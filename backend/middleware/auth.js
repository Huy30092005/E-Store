import jwt from "jsonwebtoken";

const getTokenFromHeaders = (headers) => {
  const bearer = headers.authorization;
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  return headers.token;
};

const REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

const authUser = async (req, res, next) => {
  const token = getTokenFromHeaders(req.headers);

  if (!token) {
    return res.json({ success: false, message: "Not authorized!" });
  }

  try {
    const tokenDecoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = tokenDecoded.id;
    req.user = { id: tokenDecoded.id };
    req.body = { ...req.body, userId: tokenDecoded.id };

    // Refresh token if it's about to expire in less than 5 minutes
    const now = Math.floor(Date.now() / 1000);
    if (tokenDecoded.exp && tokenDecoded.exp - now < REFRESH_THRESHOLD) {
      const newToken = jwt.sign({ id: tokenDecoded.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.setHeader('x-refresh-token', newToken);
    }

    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authUser;
