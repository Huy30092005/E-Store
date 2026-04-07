import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";

const buildCartItems = async (cartData) => {
  const itemIds = Object.keys(cartData || {});
  if (itemIds.length === 0) {
    return [];
  }

  const products = await productModel.find({ _id: { $in: itemIds } });
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const items = [];

  for (const itemId of itemIds) {
    const product = productMap.get(itemId);
    if (!product) continue;

    const modelEntries = Object.entries(cartData[itemId] || {});
    for (const [model, quantity] of modelEntries) {
      if (quantity < 1) continue;
      items.push({
        product,
        quantity,
        model,
      });
    }
  }

  return items;
};

const addtoCart = async (req, res) => {
  try {
    const { userId, itemId, models = "default" } = req.body;

    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const cartData = { ...(userData.cartData || {}) };

    if (!cartData[itemId]) {
      cartData[itemId] = {};
    }

    cartData[itemId][models] = (cartData[itemId][models] || 0) + 1;

    await userModel.findByIdAndUpdate(userId, { cartData });

    res.json({ success: true, message: "Added to cart", cartData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateCart = async (req, res) => {
  try {
    const { userId, itemId, models = "default", quantity } = req.body;

    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const cartData = { ...(userData.cartData || {}) };
    if (!cartData[itemId]) {
      cartData[itemId] = {};
    }

    if (Number(quantity) <= 0) {
      delete cartData[itemId][models];
      if (Object.keys(cartData[itemId]).length === 0) {
        delete cartData[itemId];
      }
    } else {
      cartData[itemId][models] = Number(quantity);
    }

    await userModel.findByIdAndUpdate(userId, { cartData });

    res.json({ success: true, message: "Cart updated", cartData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getUserCart = async (req, res) => {
  try {
    const { userId } = req.body;

    const userData = await userModel.findById(userId);
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    const cartData = userData.cartData || {};
    const items = await buildCartItems(cartData);

    res.json({ success: true, cartData, items });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { addtoCart, updateCart, getUserCart };
