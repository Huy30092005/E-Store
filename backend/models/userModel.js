import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
<<<<<<< HEAD
    password: { type: String },
=======
    password: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
>>>>>>> d3a3a03998afb5679ba8e055162b395a8c568b95
    role: { type: String, default: "customer" },
    cartData: { type: Object, default: {} },
    provider: { type: String, enum: ["local", "google", "github"], default: "local" },
    providerId: { type: String },

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
