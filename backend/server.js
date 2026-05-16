import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import userRouter from "./routes/userRoute.js";
import productRouter from "./routes/productRoute.js";
import cartRouter from "./routes/cartRoute.js";
import orderRouter from "./routes/orderRoute.js";
import commentRoute from "./routes/commentRoute.js";
import passport from "./config/passport.js";

const app = express();
const port = process.env.PORT || 4000;
const defaultOrigins = ["http://localhost:5173", "http://localhost:5174"];
const envOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

connectCloudinary();
app.use(passport.initialize()); 

// Routes
app.use("/api/user", userRouter);
app.use("/api/product", productRouter);
app.use("/api/cart", cartRouter);
app.use("/api/order", orderRouter);
app.use("/api/comment", commentRoute);

app.get("/", (_req, res) => res.send("API working"));

const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(port, () =>
      console.log("Server running on PORT " + port)
    );

    server.on("error", (error) => {
      console.log("Failed to start server", error.message);
      process.exit(1);
    });
  } catch (error) {
    console.log("Failed to start server", error);
    process.exit(1);
  }
};

startServer();
