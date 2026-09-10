<p align="center">
  <img src="public/icon.png" width="128" height="128" alt="FamilyNotes Logo" style="border-radius: 28px; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.25);" />
</p>

<h1 align="center">FamilyNotes</h1>

<p align="center">
  <strong>Aplicación familiar cifrada de extremo a extremo para listas de compras inteligentes y notas seguras.</strong><br>
  <em>Mobile-first, end-to-end encrypted family shopping lists and secure shared notes, built with Tauri v2 (Rust + React).</em>
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

## 📱 ¿Qué es FamilyNotes? / What is FamilyNotes?

**FamilyNotes** es una aplicación multiplataforma (Android, Windows, Linux, macOS, iOS) diseñada para que familias y hogares compartan listas de compra y notas importantes de forma ágil, intuitiva y con **privacidad absoluta**. Todos los datos se cifran localmente en tu terminal mediante criptografía moderna de grado militar antes de ser almacenados o sincronizados.

---

## 🚀 Características Principales / Key Features

### 🛒 Listas de la Compra Inteligentes
- **Múltiples Listas y Comercios**: Organiza tus compras por tienda o categoría (Mercadona, Lidl, Aldi, Farmacia, etc.) con iconos y colores personalizados.
- **Pestaña "Todas" (Vista Consolidada)**: Pestaña fija en primera posición que suma todos los artículos pendientes de todas las listas activas, mostrando el distintivo de la tienda a la que pertenece cada producto y un selector rápido de destino.
- **Reordenación Táctil y con Ratón**: Mantén pulsada una pestaña en el móvil (con respuesta háptica) o arrástrala con el ratón en escritorio para reordenar las tiendas a tu gusto.
- **Recordatorios Inteligentes de Reposición**: Sugerencias automáticas estilo carrusel para artículos frecuentes según tu patrón de compra.
- **Diccionario de Productos**: Autocompletado rápido con iconos emoji y categorías, con gestión de diccionario personalizado.
- **Sistema de Archivado**: Oculta listas completadas o temporales en una sección dedicada de archivadas en modo lectura, con opción de desarchivar o borrar definitivamente.

### 📝 Notas Familiares Seguras
- Crea notas compartidas para recetas, información del hogar, tareas o contraseñas.
- Fijación de notas importantes al principio (`Pin`).
- Archivado seguro de notas antiguas.

### 🔒 Seguridad y Cero Conocimiento (Zero-Knowledge)
- **Cifrado Local Auténtico**: Derivación de clave mediante **Argon2id** y cifrado autenticado de datos con **XChaCha20-Poly1305**.
- **Sin Dependencia de Terceros**: La contraseña maestra nunca viaja por la red ni se envía a servidores ajenos; todo el descifrado ocurre en la memoria local del dispositivo.
- **Arranque Protegido**: Pantalla de carga suave con auto-desbloqueo seguro si la contraseña está memorizada en el perfil local, o solicitud limpia de contraseña en caso contrario.

### 📡 Sincronización en la Nube mediante FTP
- **Sincronización Inteligente en Segundo Plano**: Sincroniza automáticamente tras unos segundos de inactividad, al perder el foco de la ventana o al volver a abrir la aplicación.
- **Fusión Bidireccional Sin Conflictos**: Merge inteligente que preserva cambios realizados simultáneamente en distintos terminales (listas, notas, historial y catálogo).
- **Gestión de Dispositivos Familiares**: Visualiza todos los terminales autorizados. Si revocas un dispositivo, su acceso queda bloqueado y se requerirá la contraseña maestra para re-autorizarlo.
- **Vinculación Sencilla con Código QR**: Escanea el QR generado en un terminal para conectar instantáneamente nuevos móviles o tabletas a la bóveda familiar.

### 🌐 Interfaz y Ajustes
- **Multiidioma (i18n)**: Español e Inglés con detección automática del idioma del sistema o selección manual.
- **Modo Oscuro y Claro**: Soporte para tema claro, oscuro o sincronizado con el sistema operativo.
- **Diseño Adaptativo Móvil**: Pestañas con modo compacto solo con iconos en pantallas estrechas.
- **Memoria de Ventana en Escritorio**: Recuerda el tamaño, posición y estado de pantalla completa entre sesiones.

---

## 🛠 Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Backend / Core** | [Rust](https://www.rust-lang.org/), [Tauri v2](https://v2.tauri.app/) |
| **Criptografía** | `argon2`, `chacha20poly1305`, `zeroize` |
| **Frontend** | [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Estilos y UI** | [Tailwind CSS](https://tailwindcss.com/), [Lucide Icons](https://lucide.dev/) |
| **Sincronización** | FTP nativo con reintentos y soporte UTF-8 |

---

## 📦 Instalación y Compilación

### Requisitos Previos
1. [Node.js](https://nodejs.org/) (versión 18 o superior) y `npm`.
2. [Rust](https://rustup.rs/) (herramientas `cargo` actualizadas).
3. Para Android: Android Studio, Android SDK (API 34+) y Android NDK (r26d+).

### Clonar e Instalar Dependencias
```bash
# Clonar el repositorio
git clone https://github.com/alexwing/FamilyNotes.git
cd FamilyNotes

# Instalar dependencias del frontend
npm install
```

### Ejecutar en Modo Desarrollo (Escritorio)
```bash
npm run tauri dev
```

### Compilar para Escritorio (Release)
```bash
npm run tauri build
```

### Compilar APK para Android
```bash
npm run tauri android build -- --apk --target aarch64
```
El archivo `.apk` universal resultante se generará en:
`src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk`

---

## 🔒 Arquitectura de Seguridad

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

1. **Derivación de Claves**: El password maestro se procesa mediante **Argon2id** (función resistente a ataques por GPU/ASIC) junto a un salt único de 16 bytes almacenado en la cabecera del vault.
2. **Cifrado de Datos**: La carga útil en formato JSON se cifra mediante **XChaCha20-Poly1305** con nonces de 24 bytes para garantizar confidencialidad e integridad criptográfica estricta.
3. **Persistencia y Nube**: Incluso si el servidor FTP es vulnerado o interceptado, ningún atacante puede leer los contenidos ni reconstruir las listas sin la contraseña maestra.

---

## 📄 Licencia

Este proyecto está bajo la licencia **GPL-3.0**. Consulta el archivo `LICENSE` para más detalles.

