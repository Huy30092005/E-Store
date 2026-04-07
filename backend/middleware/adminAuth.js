import jwt from "jsonwebtoken";

const getTokenFromHeaders = (headers) => {
  const bearer = headers.authorization;
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  return headers.token;
};

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

    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default adminAuth;
