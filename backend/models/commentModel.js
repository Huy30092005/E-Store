import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
        product: { type: mongoose.Schema.Types.ObjectId, ref: "product", required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        content: { type: String, required: true },
    },
    {
    minimize: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

const Comment = mongoose.model("comment", commentSchema);

export default Comment;