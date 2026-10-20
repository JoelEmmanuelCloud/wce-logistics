import { describe, expect, it } from "vitest";
import { decrypt, encrypt, hmac, numericCode, safeEqualHex, sha256 } from "@/server/crypto";

describe("field encryption", () => {
  it("round-trips values and uses a fresh IV each time", () => {
    const first = encrypt("12345678901");
    const second = encrypt("12345678901");
    expect(first).not.toBe(second);
    expect(decrypt(first)).toBe("12345678901");
    expect(decrypt(second)).toBe("12345678901");
  });

  it("rejects tampered ciphertext", () => {
    const payload = encrypt("ABC12345XY").split(".");
    payload[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(payload.join("."))).toThrow();
  });

  it("rejects unknown payload versions", () => {
    expect(() => decrypt("v0.a.b.c")).toThrow("Unsupported encrypted payload");
  });
});

describe("hashing helpers", () => {
  it("produces stable keyed hashes", () => {
    expect(hmac("otp:+2348031234567:123456")).toBe(hmac("otp:+2348031234567:123456"));
    expect(hmac("a")).not.toBe(hmac("b"));
    expect(sha256("token")).toHaveLength(64);
  });

  it("compares hex digests safely", () => {
    expect(safeEqualHex(sha256("a"), sha256("a"))).toBe(true);
    expect(safeEqualHex(sha256("a"), sha256("b"))).toBe(false);
    expect(safeEqualHex("ab", "abcd")).toBe(false);
  });

  it("generates numeric codes of the requested length", () => {
    for (let index = 0; index < 50; index += 1) {
      expect(numericCode(6)).toMatch(/^\d{6}$/);
    }
  });
});
