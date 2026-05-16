import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUrl = process.env.MONGODB_URL;

  if (!mongoUrl) {
    throw new Error("MONGODB_URL is not configured");
  }

  mongoose.connection.on("connected", () => {
    console.log("DB connected");
  });

  await mongoose.connect(`${mongoUrl}/e_commerce`, {
    serverSelectionTimeoutMS: 10000,
  });
};

export default connectDB;
