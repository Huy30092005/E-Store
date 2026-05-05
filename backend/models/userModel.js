import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, default: "customer" },
    cartData: { type: Object, default: {} },
  },
  {
    minimize: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
