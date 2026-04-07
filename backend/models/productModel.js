import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["active", "coming_soon", "discontinued"],
      default: "active",
    },
    price: { type: Number, required: true },
    originalPrice: { type: Number, default: null },
    discount: { type: Number, default: 0 },
    rating: { type: Number, default: null },
    reviewCount: { type: Number, default: 0 },
    image: { type: [String], required: true },
    category: { type: [String], required: true, default: [] },
    subCategory: { type: String, required: true },
    models: { type: [String], required: true },
    tags: { type: [String], default: [] },
    bestSeller: { type: Boolean, default: false },
    stockQuantity: { type: Number, required: true },
    date: { type: Number, required: true },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("images").get(function images() {
  return this.image;
});

productSchema.virtual("stock").get(function stock() {
  return this.stockQuantity;
});

const productModel =
  mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;
