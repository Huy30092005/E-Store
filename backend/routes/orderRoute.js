import express from "express";
import {
  placeOrder,
  placeOrderStripe,
  getAllOrders,
  userOrders,
  getOrderById,
  updateStatus,
  verifyStripe,
} from "../controllers/orderController.js";
import adminAuth from "../middleware/adminAuth.js";
import authUser from "../middleware/auth.js";

const orderRouter = express.Router();

orderRouter.post("/list", adminAuth, getAllOrders);
orderRouter.post("/status", adminAuth, updateStatus);

orderRouter.post("/place", authUser, placeOrder);
orderRouter.post("/stripe", authUser, placeOrderStripe);
orderRouter.post("/userorders", authUser, userOrders);
orderRouter.get("/:orderId", authUser, getOrderById);

orderRouter.post("/verifyStripe", authUser, verifyStripe);

export default orderRouter;
