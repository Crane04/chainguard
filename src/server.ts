import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { connectDB } from "./services/db";

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();

  const app = createApp();

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
