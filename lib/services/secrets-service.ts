import { decryptString, encryptString } from "@/lib/crypto";

export class SecretsService {
  encrypt(value: string) {
    return encryptString(value);
  }

  decrypt(value: string) {
    return decryptString(value);
  }
}

export const secretsService = new SecretsService();
