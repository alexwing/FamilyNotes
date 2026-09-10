# FamilyNotes

A mobile-first, end-to-end encrypted family sharing application for smart shopping lists and secure notes, built with **Tauri v2** (Rust + React).

## 🚀 Features

- **End-to-End Encryption**: Your data is encrypted locally using Argon2id for key derivation and XChaCha20Poly1305 for AEAD encryption. 
- **Smart Replenishment**: Amazon-style "Smart Reminders" automatically track your purchasing habits and suggest frequent items in a swipeable carousel when you need to restock.
- **Auto-Sync via FTP**: Seamlessly synchronize your encrypted vault across all your family devices using any standard FTP server, with conflict resolution and automated background pulls.
- **Secure Shared Notes**: Keep track of family recipes, passwords, and important data with fully encrypted, pinned notes.
- **Mobile First Design**: Specifically optimized for Android and iOS devices using Tailwind CSS and native-feeling UI components.
- **Cross-Platform**: Compile to Windows, macOS, Linux, Android, and iOS using a single unified codebase.

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Vite.
- **Backend**: Rust, Tauri v2.
- **Cryptography**: \`argon2\`, \`chacha20poly1305\`.

## 📦 Getting Started

### Prerequisites

1. Install [Node.js](https://nodejs.org/) and npm.
2. Install [Rust](https://rustup.rs/).
3. For Android build: Install Android Studio, Android SDK, and NDK.

### Installation

```bash
# Clone the repository
git clone https://github.com/alexwing/FamilyNotes.git
cd FamilyNotes

# Install frontend dependencies
npm install

# Run on Desktop (Dev mode)
npm run tauri dev

# Build for Android
npm run tauri android build
```

## 🔒 Security Architecture

FamilyNotes uses a zero-knowledge architecture. The master password never leaves your device. It is hashed using **Argon2id** with a random salt to derive a 256-bit encryption key. The vault contents are encrypted using **XChaCha20-Poly1305** before being saved to disk or synchronized to your FTP server. This ensures that even if your FTP server is compromised, your family's data remains 100% secure.

## 📄 License

This project is licensed under the GPL-3.0 License.

