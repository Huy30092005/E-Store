import express from "express";
import {
  loginUser,
  registerUser,
  adminLogin,
  googleAuth,
  getCurrentUser,
  listUsers,
} from "../controllers/userController.js";
import authUser from "../middleware/auth.js";
import adminAuth from "../middleware/adminAuth.js";

const userRouter = express.Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/admin", adminLogin);
userRouter.post("/google-auth", googleAuth);
userRouter.get("/me", authUser, getCurrentUser);
userRouter.get("/list", adminAuth, listUsers);

export default userRouter;
