import { decryptString, encryptString } from "@/lib/crypto";

describe("SecretsService crypto helpers", () => {
  it("encrypts and decrypts round trip", () => {
    const encrypted = encryptString("hello-duckmail");
    expect(encrypted).not.toContain("hello-duckmail");
    expect(decryptString(encrypted)).toBe("hello-duckmail");
  });

  it("throws for invalid ciphertext", () => {
    expect(() => decryptString("invalid-json")).toThrow();
  });
});
