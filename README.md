<p align="center">
  <img src="public/icon.png" width="128" height="128" alt="FamilyNotes Logo" style="border-radius: 28px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.25);" />
</p>

<h1 align="center">FamilyNotes</h1>

<p align="center">
  <strong>End-to-end encrypted family shopping lists and secure shared notes.</strong><br>
  <em>Mobile-first, zero-knowledge architecture built with Tauri v2 (Rust + React).</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2-blue?logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Rust-2021-orange?logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Security-XChaCha20--Poly1305-emerald?logo=lock&logoColor=white" alt="Encryption" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-green" alt="GPL 3.0" />
</p>

---

## 📱 What is FamilyNotes?

**FamilyNotes** is a cross-platform application (Android, Windows, Linux, macOS, iOS) built for families and households to manage shopping lists and notes with speed, ease, and **complete privacy**. Every piece of information is encrypted locally on your device with military-grade cryptography before being stored or synchronized.

---

## 🚀 Key Features

### 🛒 Smart Shopping Lists
- **Multi-Store Management**: Organize shopping lists by store or merchant (e.g. Supermarket, Pharmacy, Bakery, Hardware) with custom emoji icons and colors.
- **Consolidated "All" Tab**: A fixed first tab that sums all pending items across every active list, displaying store badges for each product and a quick destination selector when adding new items.
- **Touch & Mouse Tab Reordering**: Long-press tabs on mobile devices (with haptic vibration feedback) or drag-and-drop on desktop to rearrange store lists to your liking.
- **Smart Replenishment Reminders**: Intelligent carousel suggestions for frequently purchased products based on consumption habits.
- **Product Dictionary & Categories**: Fast autocomplete with emojis and localized categories, backed by a built-in catalog and a custom family dictionary editor.
- **Archiving System**: Archive seasonal or completed lists into a dedicated read-only section, with the ability to unarchive or permanently delete them.

### 📝 Secure Family Notes
- Create shared notes for recipes, household procedures, checklists, or private credentials.
- Pin essential notes to the top (`Pin`).
- Safe archiving and instant search.

### 🔒 Zero-Knowledge Security
- **Authentic Local Cryptography**: Password key derivation using **Argon2id** and authenticated encryption with **XChaCha20-Poly1305**.
- **No Third-Party Reliance**: Master passwords never leave your hardware; all decryption happens strictly inside device memory.
- **Protected Startup**: Clean splash loader with smooth automatic unlocking when credentials are saved locally, preventing password prompt flickering.

### 📡 Private FTP Cloud Sync
- **Intelligent Background Sync**: Automatically synchronizes after a few seconds of inactivity, upon losing window focus, or when relaunching the app.
- **Conflict-Free Bidirectional Merge**: Smart merge algorithm preserving changes made concurrently across different family devices (lists, notes, history, and catalog).
- **Family Device Management**: Inspect all registered devices. Revoke any lost or unused device remotely, locking it out until the master password is re-entered.
- **Instant QR Code Pairing**: Scan a secure QR code generated on an existing device to connect new phones or tablets in seconds.

### 🌐 Modern UI & Customization
- **Internationalization (i18n)**: Fully translated into English and Spanish with automatic system locale detection and manual switching.
- **Light & Dark Modes**: Complete theme support across the entire interface and modal dialogs.
- **Mobile-Adaptive Layout**: Responsive tab navigation (compact icon-only view on small screens) for maximum convenience.
- **Desktop Window Memory**: Remembers window dimensions, position, and fullscreen state between sessions.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend / Core** | [Rust](https://www.rust-lang.org/), [Tauri v2](https://v2.tauri.app/) |
| **Cryptography** | `argon2`, `chacha20poly1305`, `zeroize` |
| **Frontend** | [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Synchronization** | Native FTP client with retry logic and UTF-8 support |

---

## 📦 Getting Started

### Prerequisites
1. [Node.js](https://nodejs.org/) (v18 or higher) and `npm`.
2. [Rust](https://rustup.rs/) (up-to-date `cargo` toolchain).
3. For Android builds: Android Studio, Android SDK (API 34+), and Android NDK (r26d+).

### Clone & Install
```bash
# Clone repository
git clone https://github.com/alexwing/FamilyNotes.git
cd FamilyNotes

# Install frontend dependencies
npm install
```

### Run in Development Mode (Desktop)
```bash
npm run tauri dev
```

### Build for Desktop (Release)
```bash
npm run tauri build
```

### Build Android APK
```bash
npm run tauri android build -- --apk --target aarch64
```
The resulting universal release APK will be located at:
`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`

---

## 🔒 Security Architecture

```
+-------------------------------------------------------------+
|                     Master Password                         |
+-------------------------------------------------------------+
                              |
                     Argon2id (Salt + KDF)
                              v
+-------------------------------------------------------------+
|                  256-bit Encryption Key                     |
+-------------------------------------------------------------+
                              |
               XChaCha20-Poly1305 AEAD + Nonce
                              v
+-------------------------------------------------------------+
|                  Encrypted Vault Payload                    |
|           (Shopping Lists + Notes + History + Members)      |
+-------------------------------------------------------------+
                              |
                     Local Storage & FTP Sync
```

1. **Key Derivation**: The master password is processed through **Argon2id** (GPU/ASIC-resistant KDF) with a unique 16-byte salt stored in the vault header.
2. **Data Encryption**: The JSON payload is encrypted using **XChaCha20-Poly1305** authenticated cipher with a 24-byte nonce to guarantee absolute confidentiality and cryptographic integrity.
3. **Zero-Knowledge Cloud**: Even if the FTP server is intercepted or compromised, attackers cannot read vault contents without the master password.

---

## 📄 License

This project is open source and licensed under the **GPL-3.0** License. See `LICENSE` for details.


