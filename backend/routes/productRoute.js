import express from "express";
import {
  addProduct,
  listProduct,
  removeProduct,
  singleProduct,
  updateProduct,
  addComment,
  getComments,
  deleteComment,
} from "../controllers/productController.js";
import generateProductDescription from "../handlers/productDescriptionHandler.js";
import upload from "../middleware/multer.js";
import adminAuth from "../middleware/adminAuth.js";
import auth from "../middleware/auth.js";

const productRouter = express.Router();

productRouter.post(
  "/add",
  adminAuth,
  upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  addProduct
);
productRouter.post("/generate-description", adminAuth, generateProductDescription);
productRouter.post("/remove", adminAuth, removeProduct);
productRouter.post("/update", adminAuth, updateProduct);
productRouter.post("/single", singleProduct);
productRouter.get("/list", listProduct);
productRouter.post("/:productId/comments", auth, addComment);
productRouter.get("/:productId/comments", getComments);
productRouter.delete("/:productId/comments/:commentId", auth, deleteComment);

export default productRouter;
