# task7-final-project

# Vaultnote - Privacy-Focused Notes App with Encryption

Offline-first notes app. Notes are encrypted in the browser (AES-256) before they are stored in IndexedDB. No server, no account.

## Run
```
npm install
npm run dev
```
## Features
Master password lock, AES encryption (CryptoJS), PBKDF2 key derivation, IndexedDB storage, search, pin, archive, delete.

## How the security works
1. First visit: you set a master password. A random salt is created.
2. PBKDF2 turns password + salt into a 256-bit key. The key stays in memory only and is never saved.
3. Each note's title and body are AES-encrypted with that key before saving.
4. A small encrypted "verifier" lets the app check your password on unlock.
