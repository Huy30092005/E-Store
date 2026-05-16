import express from "express";
import { getCommentsByProduct, addComment } from "../controllers/commentController.js";
import auth from "../middleware/auth.js";

const commentRoute = express.Router();

commentRoute.get("/test", (_req, res) => res.json({ ok: true }));

// Get all comments for a product
commentRoute.get("/product/:productId", getCommentsByProduct);

// Add a comment to a product (requires authentication)
commentRoute.post("/product/:productId", auth, addComment);

export default commentRoute;
