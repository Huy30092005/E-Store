import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    product: { type: mongoose.Schema.Types.Mixed, default: null },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, default: 0 },
    size: { type: String, default: "" },
    model: { type: String, default: "" },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    email: { type: String, default: "" },
    address: { type: String, default: "" },
    street: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    zip: { type: String, default: "" },
    zipcode: { type: String, default: "" },
    country: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    items: { type: [orderItemSchema], required: true, default: [] },
    amount: { type: Number, required: true },
    address: { type: shippingAddressSchema, required: true },
    status: { type: String, required: true, default: "Order Placed" },
    paymentMethod: { type: String, required: true },
    payment: { type: Boolean, required: true, default: false },
    date: { type: Number, required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

orderSchema.virtual("totalAmount").get(function totalAmount() {
  return this.amount;
});

orderSchema.virtual("shippingAddress").get(function shippingAddress() {
  return this.address;
});

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;
