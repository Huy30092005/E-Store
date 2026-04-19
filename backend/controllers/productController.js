import { v2 as cloudinary } from "cloudinary";
import productModel from "../models/productModel.js";
import axios from "axios";

const parseList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const parseModels = (value) => parseList(value);

const buildProductData = (payload, image = [], fallbackProduct = null) => {
  const {
    name,
    description,
    status,
    price,
    originalPrice,
    category,
    subCategory,
    models,
    tags,
    bestSeller,
    rating,
    reviewCount,
    discount,
    stockQuantity,
  } = payload;

  const normalizedPrice = Number(price);
  const normalizedOriginalPrice =
    originalPrice != null && originalPrice !== ""
      ? Number(originalPrice)
      : normalizedPrice;
  const normalizedDiscount =
    discount != null && discount !== ""
      ? Number(discount)
      : normalizedOriginalPrice > normalizedPrice
        ? Math.round((1 - normalizedPrice / normalizedOriginalPrice) * 100)
        : 0;

  return {
    name,
    description,
    status: status || fallbackProduct?.status || "active",
    category: parseList(category),
    price: normalizedPrice,
    originalPrice: normalizedOriginalPrice,
    discount: normalizedDiscount,
    subCategory,
    bestSeller: bestSeller === true || bestSeller === "true",
    models: parseModels(models),
    tags: parseList(tags),
    rating:
      rating != null && rating !== ""
        ? Number(rating)
        : productModel.schema.path("rating").defaultValue,
    reviewCount:
      reviewCount != null && reviewCount !== ""
        ? Number(reviewCount)
        : productModel.schema.path("reviewCount").defaultValue,
    stockQuantity: Number(stockQuantity),
    ...(image.length ? { image } : {}),
  };
};

// Add product func
const addProduct = async (req, res) => {
  try {
    const image1 = req.files.image1 && req.files.image1[0];
    const image2 = req.files.image2 && req.files.image2[0];
    const image3 = req.files.image3 && req.files.image3[0];
    const image4 = req.files.image4 && req.files.image4[0];

    const images = [image1, image2, image3, image4].filter(
      (item) => item !== undefined
    );

    let imageUrl = await Promise.all(
      images.map(async (item) => {
        let result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
        });
        return result.secure_url;
      })
    );

    console.log(imageUrl);

    const productData = {
      ...buildProductData(req.body, imageUrl),
      image: imageUrl,
      date: Date.now(),
    };

    console.log(productData);

    const product = new productModel(productData);
    await product.save();

    res.json({ success: true, message: "Product added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: "Product id is required" });
    }

    const existingProduct = await productModel.findById(id);

    if (!existingProduct) {
      return res.json({ success: false, message: "Product not found" });
    }

    const updateData = buildProductData(req.body, existingProduct.image, existingProduct);

    const updatedProduct = await productModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: "Product updated",
      product: updatedProduct,
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// List product

const listProduct = async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isNaN(requestedPage) || requestedPage < 1 ? 1 : requestedPage;
    const limit = Number.isNaN(requestedLimit) || requestedLimit < 1 ? 10 : requestedLimit;
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      productModel.find({}).sort({ date: -1 }).skip(skip).limit(limit),
      productModel.countDocuments({}),
    ]);

    res.json({
      success: true,
      products,
      pagination: {
        page,
        limit,
        totalProducts,
        totalPages: Math.ceil(totalProducts / limit),
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// Remove

const removeProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.body.id);
    res.json({ success: true, message: "Product removed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// info
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel.findById(productId);
    if (!product) {
      return res.json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

// helper — fire and forget, never block the main response
const syncVectorDB = async (method, data) => {
  try {
    await axios({ method, url: `${AI_SERVICE_URL}/ingest`, data });
  } catch (err) {
    console.error("⚠️  Vector sync failed:", err.message);
    // intentionally not re-throwing — product op already succeeded
  }
};


// CREATE
export const createProductDB = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);

    // trigger after responding so the client isn't kept waiting
    await syncVector("post", { product: product.toObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// UPDATE
export const updateProductDB = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);

    await syncVector("post", { product: product.toObject() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// DELETE
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });

    await syncVector("delete", { product_id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



export const addComment = async (req, res) => {
  try {
    const { productId } = req.params;
    const { content, rating } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const alreadyCommented = product.comments.find(
      (c) => c.userId?.toString() === userId.toString()
    );

    if (alreadyCommented) {
      return res.status(400).json({ message: "You already commented" });
    }

    const newComment = {
      userId,
      content,
      rating,
    };

    product.comments.push(newComment);

    const totalRating = product.comments.reduce(
      (sum, c) => sum + (c.rating || 0),
      0
    );

    product.reviewCount = product.comments.length;
    product.rating = totalRating / product.reviewCount;

    await product.save();

    res.status(201).json({
      message: "Comment added",
      comments: product.comments,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getComments = async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await productModel
      .findById(productId)
      .populate("comments.userId", "name email");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const sortedComments = product.comments.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json(sortedComments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export const deleteComment = async (req, res) => {
  try {
    const { productId, commentId } = req.params;
    const userId = req.user._id;

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const comment = product.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }


    if (comment.userId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Not allowed" });
    }

    comment.deleteOne();

  
    const totalRating = product.comments.reduce(
      (sum, c) => sum + (c.rating || 0),
      0
    );

    product.reviewCount = product.comments.length;
    product.rating =
      product.reviewCount > 0 ? totalRating / product.reviewCount : 0;

    await product.save();

    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export { addProduct, listProduct, removeProduct, singleProduct, updateProduct };
