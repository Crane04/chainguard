import multer from "multer";

// Files are held in memory only long enough to hash + upload to R2 —
// nothing is ever written to local disk on the server.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB — generous for a prototype
});
