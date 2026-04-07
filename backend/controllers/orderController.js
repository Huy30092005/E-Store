import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";

const currency = "usd";
const deliveryCharge = 10;
const stripe = new Stripe(process.env.STRIPE_SECRET);

const serializeOrder = (order) => {
  const data = order.toObject ? order.toObject() : order;
  return {
    ...data,
    totalAmount: data.amount,
    shippingAddress: data.address,
    createdAt: data.createdAt || new Date(data.date).toISOString(),
  };
};

const normalizeAddress = (address = {}) => {
  const name =
    address.name ||
    [address.firstName, address.lastName].filter(Boolean).join(" ").trim();

  return {
    name,
    firstName: address.firstName || (name ? name.split(" ")[0] : ""),
    lastName:
      address.lastName ||
      (name && name.includes(" ") ? name.split(" ").slice(1).join(" ") : ""),
    email: address.email || "",
    address: address.address || address.street || "",
    street: address.street || address.address || "",
    city: address.city || "",
    state: address.state || "",
    zip: address.zip || address.zipcode || "",
    zipcode: address.zipcode || address.zip || "",
    country: address.country || "",
    phone: address.phone || "",
  };
};

const normalizeItems = (items = []) => {
  return items.map((item) => {
    const product = item.product || null;
    const productName =
      item.name || product?.name || "";
    const productPrice =
      Number(item.price ?? product?.price ?? 0);

    return {
      name: productName,
      product,
      quantity: Number(item.quantity || 1),
      price: productPrice,
      size: item.size || "",
      model: item.model || item.models || item.size || "",
    };
  });
};

const computeAmount = (items = [], amount) => {
  if (amount != null && amount !== "") {
    return Number(amount);
  }

  return items.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);
};

const getOrderItemProductId = (item = {}) => {
  if (!item.product) return null;
  if (typeof item.product === "string") return item.product;
  return item.product._id || item.product.id || null;
};

const decrementStockForItems = async (items = []) => {
  const decrementedItems = [];

  for (const item of items) {
    try {
      const productId = getOrderItemProductId(item);
      const quantity = Number(item.quantity || 0);

      if (!productId || quantity <= 0) {
        throw new Error(`Invalid order item for stock update: ${item.name || "Unknown product"}`);
      }

      const updatedProduct = await productModel.findOneAndUpdate(
        {
          _id: productId,
          stockQuantity: { $gte: quantity },
        },
        {
          $inc: { stockQuantity: -quantity },
        },
        { new: true }
      );

      if (!updatedProduct) {
        const product = await productModel.findById(productId);
        const productName = product?.name || item.name || "This product";
        throw new Error(`${productName} does not have enough stock to complete the order.`);
      }

      decrementedItems.push({ productId, quantity });
    } catch (error) {
      await Promise.all(
        decrementedItems.map(({ productId, quantity }) =>
          productModel.findByIdAndUpdate(productId, {
            $inc: { stockQuantity: quantity },
          })
        )
      );

      throw error;
    }
  }
};

const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const normalizedItems = normalizeItems(items);
    const normalizedAddress = normalizeAddress(address);

    await decrementStockForItems(normalizedItems);

    const orderData = {
      userId,
      items: normalizedItems,
      address: normalizedAddress,
      amount: computeAmount(normalizedItems, amount),
      paymentMethod: "COD",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    await userModel.findByIdAndUpdate(userId, { cartData: {} });

    res.json({
      success: true,
      message: "Order placed",
      order: serializeOrder(newOrder),
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const placeOrderStripe = async (req, res) => {
  try {
    const { userId, items, amount, address } = req.body;
    const { origin } = req.headers;
    const normalizedItems = normalizeItems(items);
    const normalizedAddress = normalizeAddress(address);

    const orderData = {
      userId,
      items: normalizedItems,
      address: normalizedAddress,
      amount: computeAmount(normalizedItems, amount),
      paymentMethod: "Stripe",
      payment: false,
      date: Date.now(),
    };

    const newOrder = new orderModel(orderData);
    await newOrder.save();

    const lineItems = normalizedItems.map((item) => ({
      price_data: {
        currency,
        product_data: {
          name: item.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));

    lineItems.push({
      price_data: {
        currency,
        product_data: {
          name: "Delivery Charges",
        },
        unit_amount: deliveryCharge * 100,
      },
      quantity: 1,
    });

    const session = await stripe.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
      line_items: lineItems,
      mode: "payment",
    });

    res.json({
      success: true,
      session_url: session.url,
      order: serializeOrder(newOrder),
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};


const verifyStripe = async (req, res) => {
  const { orderId, success, userId } = req.body;

  try {
    if (success === "true") {
      const order = await orderModel.findById(orderId);

      if (!order) {
        return res.json({ success: false, message: "Order not found" });
      }

      if (!order.payment) {
        await decrementStockForItems(order.items);
      }

      await orderModel.findByIdAndUpdate(orderId, { payment: true });
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
      return res.json({ success: true });
    }

    await orderModel.findByIdAndDelete(orderId);
    res.json({ success: false });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getAllOrders = async (_req, res) => {
  try {
    const orders = await orderModel.find({});
    res.json({ success: true, orders: orders.map(serializeOrder) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;

    const orders = await orderModel.find({ userId });
    res.json({ success: true, orders: orders.map(serializeOrder) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.json({ success: false, message: "Order not found" });
    }

    if (String(order.userId) !== String(req.userId)) {
      return res.json({ success: false, message: "Not authorized!" });
    }

    res.json({ success: true, order: serializeOrder(order) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    await orderModel.findByIdAndUpdate(orderId, { status });
    res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  verifyStripe,
  placeOrder,
  placeOrderStripe,
  getAllOrders,
  userOrders,
  getOrderById,
  updateStatus,
};
