import { v2 as cloudinary } from "cloudinary";
import productModel from "../models/productModel.js";

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

export { addProduct, listProduct, removeProduct, singleProduct, updateProduct };
