import { createHash } from "crypto";

/**
 * Computes the SHA-256 hash of a buffer.
 * This is the single source of truth for "what does this file's fingerprint look like" —
 * used both at intake (to create the first chain entry) and at verification time
 * (to check whether the file has changed since intake).
 */
export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
