import mongoose from "mongoose";

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI as string;

  if (!uri) {
    throw new Error("MONGODB_URI is not set in the environment");
  }

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
