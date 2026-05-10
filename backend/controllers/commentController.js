import Comment from "../models/commentModel.js";
import Product from "../models/productModel.js";

// Get all comments for a product
export const getCommentsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const comments = await Comment.find({ product: productId })
      .populate("user", "name")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a comment to a product

export const addComment = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, content } = req.body;
    const userId = req.user.id;

    const comment = new Comment({
      user: userId,
      product: productId,
      rating,
      content,
    });
    await comment.save();
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};