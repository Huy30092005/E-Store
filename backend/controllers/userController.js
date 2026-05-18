import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const USER_ROLES = ["customer", "admin"];
const USER_STATUSES = ["active", "blocked"];

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET);
};

const createAdminToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const sanitizeUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role || "customer",
  status: user.status || "active",
  provider: user.provider || "local",
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    if (user.status === "blocked") {
      return res.json({ success: false, message: "Account is blocked" });
    }

    if (!user.password) {
      return res.json({
        success: false,
        message: `Please sign in with ${user.provider || "your original provider"}.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials!" });
    }

    const token = createToken(user._id);
    res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, sub: providerId } = ticket.getPayload();

    let user = await userModel.findOne({ email });

    if (!user) {
      user = new userModel({
        name,
        email,
        provider: "google",
        providerId,
        role: "customer",
      });
      await user.save();
    } else if (user.status === "blocked") {
      return res.json({ success: false, message: "Account is blocked" });
    } else if (user.provider === "google" && !user.providerId) {
      user.providerId = providerId;
      await user.save();
    }

    const jwtToken = createToken(user._id);
    res.json({ success: true, token: jwtToken, user: sanitizeUser(user) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const exist = await userModel.findOne({ email });
    if (exist) {
      return res.json({ success: false, message: "Already exists!" });
    }

    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a validated email!",
      });
    }

    if (!password || password.length < 8) {
      return res.json({
        success: false,
        message: "Enter a strong passsword!",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({
      name,
      email,
      password: hashedPassword,
      role: "customer",
      status: "active",
    });

    const user = await newUser.save();
    const token = createToken(user._id);

    res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: sanitizeUser(user) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const getUserOrderStats = async (users) => {
  const userIds = users.map((user) => String(user._id));

  if (!userIds.length) {
    return new Map();
  }

  const stats = await orderModel.aggregate([
    { $match: { userId: { $in: userIds } } },
    {
      $group: {
        _id: "$userId",
        orderCount: { $sum: 1 },
        totalSpent: { $sum: "$amount" },
      },
    },
  ]);

  return new Map(stats.map((item) => [item._id, item]));
};

const serializeAdminUser = (user, statsByUserId = new Map()) => {
  const stats = statsByUserId.get(String(user._id)) || {};

  return {
    ...sanitizeUser(user),
    orderCount: stats.orderCount || 0,
    totalSpent: stats.totalSpent || 0,
  };
};

const buildUserListQuery = ({ search = "", role = "", status = "" }) => {
  const query = {};
  const trimmedSearch = String(search || "").trim();
  const roleValue = String(role || "");
  const statusValue = String(status || "");

  if (trimmedSearch) {
    const searchRegex = new RegExp(trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  if (USER_ROLES.includes(roleValue)) {
    query.role = roleValue;
  }

  if (USER_STATUSES.includes(statusValue)) {
    query.status = statusValue;
  }

  return query;
};

const assertCanRemoveActiveAdmin = async (user) => {
  if (user.role !== "admin" || user.status === "blocked") {
    return null;
  }

  const activeAdminCount = await userModel.countDocuments({
    role: "admin",
    status: "active",
  });

  if (activeAdminCount <= 1) {
    return "At least one active database admin must remain.";
  }

  return null;
};

const listUsers = async (req, res) => {
  try {
    const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;
    const query = buildUserListQuery(req.query);
    const usersQuery = userModel.find(query, "-password").sort({ createdAt: -1 });

    if (shouldPaginate) {
      usersQuery.skip(skip).limit(limit);
    }

    const [users, totalUsers] = await Promise.all([
      usersQuery,
      userModel.countDocuments(query),
    ]);
    const statsByUserId = await getUserOrderStats(users);

    res.json({
      success: true,
      users: users.map((user) => serializeAdminUser(user, statsByUserId)),
      pagination: {
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!USER_ROLES.includes(role)) {
      return res.json({ success: false, message: "Invalid user role." });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (req.admin?.userId === String(user._id) && role !== "admin") {
      return res.json({ success: false, message: "You cannot remove your own admin role." });
    }

    if (user.role === "admin" && role !== "admin") {
      const adminError = await assertCanRemoveActiveAdmin(user);
      if (adminError) {
        return res.json({ success: false, message: adminError });
      }
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: "User role updated.",
      user: serializeAdminUser(user),
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    if (!USER_STATUSES.includes(status)) {
      return res.json({ success: false, message: "Invalid user status." });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (req.admin?.userId === String(user._id) && status === "blocked") {
      return res.json({ success: false, message: "You cannot block your own account." });
    }

    if (status === "blocked") {
      const adminError = await assertCanRemoveActiveAdmin(user);
      if (adminError) {
        return res.json({ success: false, message: adminError });
      }
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: status === "blocked" ? "User blocked." : "User activated.",
      user: serializeAdminUser(user),
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (req.admin?.userId === String(user._id)) {
      return res.json({ success: false, message: "You cannot delete your own account." });
    }

    const adminError = await assertCanRemoveActiveAdmin(user);
    if (adminError) {
      return res.json({ success: false, message: adminError });
    }

    const orderCount = await orderModel.countDocuments({ userId: String(user._id) });
    if (orderCount > 0) {
      user.status = "blocked";
      await user.save();
      return res.json({
        success: true,
        message: "User has order history, so the account was blocked instead of deleted.",
        action: "blocked",
        user: serializeAdminUser(user, new Map([[String(user._id), { orderCount }]])),
      });
    }

    await userModel.deleteOne({ _id: user._id });

    res.json({
      success: true,
      message: "User deleted.",
      action: "deleted",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      process.env.ADMIN_EMAIL &&
      process.env.ADMIN_PASSWORD &&
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = createAdminToken({ email: process.env.ADMIN_EMAIL, role: "admin" });
      return res.json({ success: true, token });
    }

    const user = await userModel.findOne({ email });

    if (!user || user.role !== "admin" || !user.password) {
      return res.json({ success: false, message: "invalid credential!" });
    }

    if (user.status === "blocked") {
      return res.json({ success: false, message: "Account is blocked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "invalid credential!" });
    }

    const token = createAdminToken({ id: user._id, role: "admin" });
    return res.json({ success: true, token, user: sanitizeUser(user) });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const createAdminUser = async (req, res) => {
  try {
    const { name, email, password, role = "customer", status = "active" } = req.body;

    if (!name?.trim()) {
      return res.json({ success: false, message: "Name is required." });
    }

    if (!validator.isEmail(email || "")) {
      return res.json({ success: false, message: "Please enter a valid email." });
    }

    if (!password || password.length < 8) {
      return res.json({ success: false, message: "Password must be at least 8 characters." });
    }

    if (!USER_ROLES.includes(role)) {
      return res.json({ success: false, message: "Invalid user role." });
    }

    if (!USER_STATUSES.includes(status)) {
      return res.json({ success: false, message: "Invalid user status." });
    }

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await userModel.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      role,
      status,
      provider: "local",
    });

    res.json({
      success: true,
      message: "User created.",
      user: serializeAdminUser(user),
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email } = req.body;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (!name?.trim()) {
      return res.json({ success: false, message: "Name is required." });
    }

    if (!validator.isEmail(email || "")) {
      return res.json({ success: false, message: "Please enter a valid email." });
    }

    const duplicateUser = await userModel.findOne({ email, _id: { $ne: user._id } });
    if (duplicateUser) {
      return res.json({ success: false, message: "Email is already in use." });
    }

    user.name = name.trim();
    user.email = email;
    await user.save();

    res.json({
      success: true,
      message: "User profile updated.",
      user: serializeAdminUser(user),
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { password } = req.body;
    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found." });
    }

    if (!password || password.length < 8) {
      return res.json({ success: false, message: "Password must be at least 8 characters." });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.provider = "local";
    await user.save();

    res.json({
      success: true,
      message: "User password reset.",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  loginUser,
  registerUser,
  adminLogin,
  googleAuth,
  getCurrentUser,
  listUsers,
  createAdminUser,
  updateUserProfile,
  updateUserRole,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
};
