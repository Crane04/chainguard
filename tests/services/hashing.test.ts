import { sha256 } from "../../src/services/hashing";

describe("sha256", () => {
  it("matches the known SHA-256 digest of a fixed input", () => {
    const digest = sha256(Buffer.from("hello"));
    expect(digest).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("is deterministic for the same input", () => {
    const buffer = Buffer.from("digital evidence");
    expect(sha256(buffer)).toBe(sha256(Buffer.from(buffer)));
  });

  it("produces different hashes for different input", () => {
    expect(sha256(Buffer.from("a"))).not.toBe(sha256(Buffer.from("b")));
  });
});
