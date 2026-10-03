import CryptoJS from 'crypto-js'

// Turns the master password into a 256-bit key (PBKDF2 + SHA-256 + random salt).
export const deriveKey = (password: string, saltHex: string) =>
  CryptoJS.PBKDF2(password, CryptoJS.enc.Hex.parse(saltHex), { keySize: 8, iterations: 10000, hasher: CryptoJS.algo.SHA256 }).toString()

export const randomSalt = () => CryptoJS.lib.WordArray.random(16).toString()

// AES-encrypts any JSON-friendly value.
export const encrypt = (value: unknown, key: string) => CryptoJS.AES.encrypt(JSON.stringify(value), key).toString()

// Returns null when the key is wrong or the data is damaged.
export function decrypt<T>(cipher: string, key: string): T | null {
  try {
    const text = CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8)
    return text ? (JSON.parse(text) as T) : null
  } catch {
    return null
  }
}
