import jwt from "jsonwebtoken";

const getTokenFromHeaders = (headers) => {
  const bearer = headers.authorization;
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7);
  }

  return headers.token;
};

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
    next();
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export default authUser;
