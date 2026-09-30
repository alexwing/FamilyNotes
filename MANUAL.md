# FamilyNotes — User Manual & Operating Guide

Welcome to the **FamilyNotes User Manual**. This comprehensive guide walks you through every feature, workflow, and security mechanism of FamilyNotes across **Desktop** (Windows, macOS, Linux) and **Mobile** (Android, iOS).

---

## Table of Contents

1. [Introduction & Zero-Knowledge Security](#1-introduction--zero-knowledge-security)
2. [Interface & Navigation Overview](#2-interface--navigation-overview)
3. [Smart Shopping Lists](#3-smart-shopping-lists)
   - [Store Tabs & List Management](#store-tabs--list-management)
   - [The Consolidated "All" Tab](#the-consolidated-all-tab)
   - [Adding Products & Autocomplete](#adding-products--autocomplete)
   - [Purchasing & Clearing Items](#purchasing--clearing-items)
   - [Tab Reordering (Drag-and-Drop & Touch Long-Press)](#tab-reordering-drag-and-drop--touch-long-press)
   - [Archiving Lists](#archiving-lists)
4. [Family Tasks & Kanban Boards](#4-family-tasks--kanban-boards)
   - [Dual Views: Kanban Board & Structured List](#dual-views-kanban-board--structured-list)
   - [Customizing Columns & Statuses](#customizing-columns--statuses)
   - [In-Place Quick Editing & Nudge Controls](#in-place-quick-editing--nudge-controls)
   - [Jira-Style Card Detail ("Ficha de Tarea")](#jira-style-card-detail-ficha-de-tarea)
5. [Encrypted Family Notes](#5-encrypted-family-notes)
   - [Creating & Editing Notes](#creating--editing-notes)
   - [Pinning Important Notes](#pinning-important-notes)
   - [Real-Time Search](#real-time-search)
6. [Purchase History & Smart Suggestions](#6-purchase-history--smart-suggestions)
7. [Family Devices Management](#7-family-devices-management)
   - [Viewing Connected Devices](#viewing-connected-devices)
   - [Remote Device Revocation](#remote-device-revocation)
8. [Instant QR Code Device Pairing](#8-instant-qr-code-device-pairing)
   - [Why the Master Password is Never in the QR](#why-the-master-password-is-never-in-the-qr)
   - [Step-by-Step Pairing Workflow](#step-by-step-pairing-workflow)
9. [Private Cloud Sync (FTP / FTPS) & Smart Merge](#9-private-cloud-sync-ftp--ftps--smart-merge)
   - [Supported Protocols & Background Sync](#supported-protocols--background-sync)
   - [Deterministic Tombstone Merge (Preventing Zombie Items)](#deterministic-tombstone-merge-preventing-zombie-items)
   - [Conflict-Free Merging of Concurrent Edits](#conflict-free-merging-of-concurrent-edits)
10. [Preferences, Themes & Internationalization](#10-preferences-themes--internationalization)

---

## 1. Introduction & Zero-Knowledge Security

**FamilyNotes** is an encrypted household organizer designed to keep your family's shopping lists, tasks, and private notes completely synchronized without surrendering your personal data to proprietary cloud services.

### Core Cryptographic Principles
- **Argon2id Key Derivation**: Your master password is never stored anywhere on disk or in the cloud. It is derived into an encryption key using the memory-hard **Argon2id** algorithm with a dedicated 16-byte cryptographic salt.
- **Authenticated Encryption (AEAD)**: Vault data is protected by **XChaCha20-Poly1305** using unique 24-byte nonces. Any tampering, corruption, or eavesdropping is mathematically detected and rejected.
- **Zero-Knowledge Cloud**: Synchronization happens directly between your own devices and your private FTP/FTPS server. The server only ever sees encrypted `.fnvault` blobs.

---

## 2. Interface & Navigation Overview

The FamilyNotes interface is designed to adapt seamlessly between desktop widescreen layouts and compact touch devices:

- **Header Bar**:
  - **App Brand & Device Name**: Shows the current active device identity (e.g. *Alejandro*).
  - **Sync Indicator (🔄)**: Displays synchronization status (*Synced*, *Syncing...*, or *Sync Error*) and triggers immediate sync on click.
  - **Dictionary (📖)**: Opens the product catalog editor.
  - **Vault Manager (🗄️)**: Allows switching between multiple isolated vaults.
  - **Settings (⚙️)**: Configures language, theme, device identity, FTP credentials, and security options.
  - **Lock Button (🔒)**: Locks the vault immediately, purging decryption keys from device RAM.
- **Main Navigation**: Switch between **Lists** (🛒), **Notes** (📝), and **History** (⏱️). On desktop, this appears in the top navigation bar; on mobile, it anchors to the bottom for ergonomic thumb navigation.

---

## 3. Smart Shopping Lists

<p align="center">
  <img src="screenshots/01.png" width="400" alt="FamilyNotes Shopping List Mobile View" style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.15);" />
  <br>
  <em>Figure 1: Shopping Lists view on mobile (Light Theme), showing the consolidated "All" tab, store badges, and categorized products.</em>
</p>

### Store Tabs & List Management
You can organize shopping lists by specific stores or merchants (e.g. **Dia**, **Mercadona**, **Aldi**, **Pharmacy**, **Bakery**):
- Each list can be assigned a custom emoji icon and accent color.
- Badges on each tab clearly show the number of pending products to purchase in that store.
- Tap the **"+ New list"** button to create a new shopping destination anytime.

### The Consolidated "All" Tab
The first tab is **"All"** (Todas). It aggregates pending items across every active list:
- **Store Badges**: Each item displayed in the "All" view shows a colored badge indicating which store it belongs to (e.g., `Dia`, `Mercadona`).
- **Destination Selector**: When the "All" tab is active, a quick destination selector (`Add to: [Dia] [Mercadona] [Aldi]`) appears directly above the input bar, allowing you to add products to any store without switching tabs.
- The "All" tab is fixed at the start of the tab row for instant access.

<p align="center">
  <img src="screenshots/02.png" width="90%" alt="FamilyNotes Shopping List Desktop View" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" />
  <br>
  <em>Figure 2: Desktop widescreen view (Dark Mode), displaying "To Buy" products and the "Purchased" history section.</em>
</p>

### Adding Products & Autocomplete
1. Click or tap into the **"Add item to shopping list..."** field.
2. Start typing the name of any item (e.g., *Nestea*, *Coca Cola*, *Dorada*).
3. The integrated dictionary suggests products with automatic emoji icons and category categorization (*Beverages*, *Meat & Seafood*, *Bakery*, *Dairy*, etc.).
4. Press **Enter** or tap the **"+"** button to add the item.

### Purchasing & Clearing Items
- **Mark as Purchased**: Tap or click the round checkbox next to any product. It will move down to the **"PURCHASED"** section with a timestamp and attribution of who bought it.
- **Clear Purchased**: Tap **"Clear purchased"** to dismiss completed items and record them into the household consumption history for smart replenishment suggestions.

### Tab Reordering (Drag-and-Drop & Touch Long-Press)
You can reorganize your store tabs in any preferred order (for instance, ordering them by the route you take during your weekly shopping run):
- **On Desktop**: Click and drag any store tab horizontally to drop it into a new position.
- **On Mobile**: Press and hold (long-press) a tab. Your device will provide a gentle haptic vibration feedback, allowing you to slide the tab to its new slot.

### Archiving Lists
When a seasonal list (such as *Christmas Dinner* or *Summer Camping*) is no longer actively needed, you can archive it:
- Archiving preserves all products in a read-only state without permanently deleting them.
- Access archived lists at any time via the **"Archived lists"** button to restore or review them.

---

## 4. Family Tasks & Kanban Boards

FamilyNotes features an interactive, reliable **Task Management & Kanban** module designed to coordinate family to-dos, renovation projects, chore allocations, and travel preparations.

### Dual Views: Kanban Board & Structured List
Switch between visualization modes using the view toggle buttons in the top toolbar:
- **Kanban Board**: Visual cards arranged across customizable status columns. Cards display task titles, priority badges, assigned members, due date status, and tags. Cards can be moved with native HTML5 drag-and-drop or using quick left/right nudge buttons for mobile ergonomics.
- **Structured List / Table**: A tabular overview with structured columns (*Status*, *Title*, *Priority*, *Assignee*, *Due Date*, and *Actions*). Quickly alter status and priority dropdowns in-place directly from the row.

### Customizing Columns & Statuses
Task statuses represent the Kanban board columns. You can fully customize them via the **"Columns" (⚙️)** button:
- **Add New Column**: Create columns tailored to your household (e.g. *Backlog*, *In Review*, *Blocked*, *Waiting For Delivery*).
- **Color Palette & Ordering**: Assign distinct colors from an accessible palette and rearrange column order with Up/Down buttons.
- **Completed Status Flag**: Mark columns as completed statuses (e.g. *Done* or *Finished*). Moving tasks into or out of these columns automatically adjusts the task's completion state.
- **Safe Column Deletion**: To prevent losing data, if you delete a column containing active tasks, FamilyNotes prompts you to choose a fallback destination column to automatically reassign all existing tasks before the column is deleted.

### Drag-and-Drop & Note Conversion in Kanban
- **Drag-and-Drop Task Cards**: Move cards effortlessly across columns or reorder within a column. Columns highlight with visual drop targets and pulse indicators.
- **Drag-and-Drop Vault Notes into Kanban**: Click the **"Notes" (📄)** button in the toolbar to reveal your vault notes in a side drawer. Drag any note directly into any Kanban column to instantly convert it into a task with the note's title, markdown content, and tags. Alternatively, click "+ [Column]" inside the drawer for 1-click conversion.
- **One-Tap Completion**: Click the circle checkbox on any card or table row to immediately mark the task completed or send it back to the pending column.
- **Mobile-Friendly Column Nudging**: On touchscreens or when you prefer not to drag, tap the `<` and `>` arrow buttons on cards to swiftly advance tasks to the adjacent column.

### Tag Filtering & Instant Search
- **Filter by Tag**: Use the Tag selector in the toolbar to display only tasks containing a specific tag (e.g. `#Urgente`, `#Compras`, `#Hogar`).
- **Clickable Tag Chips**: Click any `#tag` badge directly on a Kanban card or table row to toggle filtering by that tag immediately.
- **Active Tag Banner**: An active filter banner clearly displays the selected tag and matching task count, with an instant `(✕)` button to clear the filter.
- **Search & Multi-Filters**: Combine tag filtering with status filters, priority filters, and keyword searches across titles, descriptions, and assignees.

### Jira-Style Card Detail ("Ficha de Tarea")
Clicking on any card or table row opens a focused, simplified Jira-style detail modal featuring:
- **Title**: Clear task headline.
- **Status & Priority**: Quick selectors with color-coded badges (Low 🟢, Medium 🔵, High 🟠, Urgent 🔴).
- **Assignee**: Assign tasks to specific family members from a dropdown or enter a custom name.
- **Due Date**: Date selector with automatic visual badges for **Due Today** (amber) and **Overdue** (red).
- **Tags & Labels**: Add custom hashtag categories (e.g. `#Garden`, `#Car`, `#School`).
- **Markdown Description with Live Preview**: Rich description editor supporting bold text, lists, and code blocks, with toggleable **Write** and **Preview** tabs.
- **Timestamps**: Displays creation and last modification timestamps for accountability.

---

## 5. Encrypted Family Notes

FamilyNotes includes a dedicated, encrypted notes repository for recipes, checklists, repair manuals, or private household credentials.

<p align="center">
  <img src="screenshots/03.png" width="90%" alt="FamilyNotes Notes Desktop View" style="border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.4);" />
  <br>
  <em>Figure 3: Family Notes desktop grid (Dark Mode) with pinned cards, recipe notes, and quick search.</em>
</p>

### Creating & Editing Notes
1. Navigate to the **Notes** tab.
2. Click **"+ New Note"**.
3. Enter a title and write your content. You can write formatted multi-line text, bullet points, checklists, and instructions.
4. Changes are encrypted and saved locally in real-time.

<p align="center">
  <img src="screenshots/04.png" width="400" alt="FamilyNotes Notes Mobile View" style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.25);" />
  <br>
  <em>Figure 4: Mobile notes view (Dark Mode), displaying responsive single-column cards and quick note creation.</em>
</p>

### Pinning Important Notes
Keep essential notes right at the top of your screen:
- Click the **Pin (📌)** icon on any note card.
- Pinned notes automatically position themselves at the beginning of the notes grid with a prominent golden badge.

### Real-Time Search
Use the top search bar (**"Search family notes..."**) to filter notes instantly by words contained in either their title or body.

---

## 6. Purchase History & Smart Suggestions

Every time items are checked off and cleared, FamilyNotes records the event in an encrypted local history log:
- **Consumption Habits**: The app calculates how frequently products are bought.
- **Smart Replenishment Carousel**: Items that are nearing their typical repurchase window appear in a suggestions carousel in the shopping view for single-click addition.
- **Permanent Deletion (Tombstone Tracking)**: If you remove an item from your history, FamilyNotes writes a cryptographic tombstone marker so that subsequent synchronizations with other devices never resurrect the deleted item.

---

## 7. Family Devices Management

<p align="center">
  <img src="screenshots/05.png" width="400" alt="Family Devices Management" style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.25);" />
  <br>
  <em>Figure 5: Family Devices tab in Settings, showing registered devices, online status, and remote revocation controls.</em>
</p>

### Viewing Connected Devices
In **Settings (⚙️) > Family Devices**, you can inspect all hardware registered with access to the vault:
- **This Device**: Highlights your current device (e.g. *Alejandro (This device)*) and displays its active *Online* status.
- **Remote Devices**: Lists other family devices (e.g. *Móvil Ale*) with their connection type (*FTP Sync*).

### Remote Device Revocation
If a family smartphone is lost, stolen, or decommissioned:
1. Open the **Family Devices** tab on any authorized device.
2. Tap the **Trash (🗑️)** icon next to the device to revoke.
3. Confirm the revocation dialog.
4. On the next synchronization, the revoked device is immediately ejected from the family vault and locked out. It will require entering the master password to regain access.

---

## 8. Instant QR Code Device Pairing

Connecting a new family phone or tablet takes just seconds using the built-in secure QR pairing system.

<p align="center">
  <img src="screenshots/06.png" width="400" alt="Scan to Link QR Code Modal" style="border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.25);" />
  <br>
  <em>Figure 6: "Scan to Link" QR Code modal with connection parameters and zero-knowledge security disclaimer.</em>
</p>

### Why the Master Password is Never in the QR
> [!IMPORTANT]
> **Strict Zero-Knowledge Guarantee**: The QR code contains **only** the FTP server connection parameters and vault file name. For security, the **master password is NEVER encoded into the QR code**.
> When the new user scans the code, the application downloads the encrypted vault file from your FTP server, and the user must type the master password to unlock and decrypt it locally.

### Step-by-Step Pairing Workflow

#### On the Primary (Existing) Device:
1. Open **Settings (⚙️)** and select the **Family Devices** tab.
2. Under the **Link Family Device** card, tap **"Show QR Code"**.
3. A modal displaying the **Scan to Link** QR code will appear (Figure 6).

#### On the New Device:
1. Launch FamilyNotes on the new smartphone or computer.
2. On the welcome screen, choose **"Scan Family QR"** (or use the camera button).
3. Point your camera at the QR code on the primary screen.
   - *Alternative 1*: If your camera is unavailable, tap **"Upload QR image / photo"** to select a screenshot.
   - *Alternative 2*: Tap **"Paste"** if you copied the link string from the clipboard.
4. Once scanned, FamilyNotes connects to your private FTP server and downloads the vault file.
5. Enter your vault's **Master Password** to complete setup and start collaborating.

---

## 9. Private Cloud Sync (FTP / FTPS) & Smart Merge

FamilyNotes uses a standard, non-proprietary FTP/FTPS backend so you can host your data anywhere with complete autonomy:

### Supported Protocols & Background Sync
- **Protocols**: Standard **FTP** (Port 21) and secure **FTPS** (Explicit TLS).
- **Background Synchronization**:
  - Automatically triggers after a few seconds of inactivity following edits (debounced).
  - Automatically syncs when the window or app regains focus.
  - Automatically syncs upon application launch.
- **Manual Sync**: Tap the **Sync (🔄)** icon in the top header anytime for an immediate bidirectional refresh.

### Deterministic Tombstone Merge (Preventing Zombie Items)
In decentralized zero-knowledge synchronization, a common pitfall is the **"zombie item"** problem: if User A deletes an item while User B is offline, a naive merge would see that User B still has the item and re-add ("resurrect") it to User A's list.

FamilyNotes solves this with an encrypted **Tombstone Deletion Tracking** algorithm:

1. **Tombstone Union**:
   - Whenever any entity is deleted locally, its unique identifier is recorded into dedicated tombstone collections in the vault (`deleted_list_ids`, `deleted_item_ids`, `deleted_note_ids`, `deleted_catalog_ids`, `deleted_history_items`, `deleted_member_ids`, `deleted_task_ids`, and `deleted_task_status_ids`).
   - When synchronizing with the FTP server (`sync_now`), the application downloads and decrypts the remote vault. It then computes the union of both local and remote tombstone sets, ensuring no deletion event is lost.

2. **Pre-Merge Filtering**:
   - **Before** merging lists, items, notes, tasks, or products, FamilyNotes filters both local and remote collections against the consolidated tombstone set.
   - Any item, note, task, list, or catalog entry whose ID is marked as deleted is immediately discarded. This guarantees that deleted items can never be resurrected by an older remote vault.

3. **Encrypted Propagation**:
   - The unified tombstone set is sealed directly into the local vault data.
   - The newly merged snapshot is encrypted using **XChaCha20-Poly1305** and uploaded back to the FTP server.
   - When other family devices perform their next synchronization, they download the updated vault, absorb the tombstones, and automatically purge the deleted items from their local copies.

### Conflict-Free Merging of Concurrent Edits
- **Shopping Lists & Items**: Products added or checked off on different devices concurrently are merged without data loss. If an item was toggled to purchased on one device while another item was added to the same list on a different device, both actions are preserved.
- **Family Tasks & Kanban**: Tasks added, edited, reordered, or moved between columns across devices are safely merged using timestamp comparisons, respecting deleted tombstones.
- **Family Notes**: Notes created or modified on different devices are merged by timestamp and note ID. Pinned states are respected.
- **Product Dictionary & History**: Custom products added to the family catalog or new purchase records are safely aggregated into the shared vault.
- **Remote Revocation**: If a device ID is revoked in the family members list, that revocation tombstone is propagated to immediately lock out the unauthorized device upon its next sync.

---

## 10. Preferences, Themes & Internationalization

In **Settings (⚙️) > General**, customize your daily experience:

- **Theme**:
  - **🌐 System**: Follows your operating system's light or dark mode.
  - **☀️ Light**: Clean, high-contrast light theme.
  - **🌙 Dark**: Elegant deep dark mode optimized for OLED screens and nighttime shopping.
- **Language**:
  - **🌐 System**: Automatically detects your device language.
  - **🇪🇸 Español**: Full Spanish localization.
  - **🇬🇧 English**: Full English localization.
- **Vault Modules & Section Customization**:
  - Customize which modules are enabled for the current vault: **Shopping lists**, **Family tasks (Kanban)**, **Family notes**, and **Purchase history**.
  - Tailor vaults to your workflow (e.g., disable shopping and history for a dedicated notes/tasks vault, or disable tasks and notes for a shared grocery vault).
  - Safety check: at least one tab must remain active at all times. Desktop header tabs and mobile bottom navigation bars adapt dynamically. When Shopping Lists is disabled, the product dictionary icon in the top header is also hidden automatically.
- **Active Tab Memory**:
  - FamilyNotes automatically preserves your last active tab (`lists`, `tasks`, `notes`, or `history`).
  - When closing and reopening the app or switching vaults, you are seamlessly restored to where you were working.
- **Text & Display Size (Scaling & Accessibility)**:
  - Select between 3 proportional levels: **Normal (100%)**, **Large (+15%)**, and **Extra Large (+30%)**.
  - Text, icons, shopping items, and markdown contents scale harmoniously across desktop and mobile without breaking layouts.
- **Default Note Open Mode & Mode Memory**:
  - Choose whether notes open in **Editor (Write)** mode or **Markdown Preview (Read)** mode.
  - FamilyNotes automatically remembers the mode you used last when viewing notes, applying it globally so you can browse notes in preview mode without having to click the preview button each time.
- **Device Name**: Personalize the name shown to family members (e.g. *Dad's Phone*, *Kitchen Tablet*).
- **Master Password Update**: Safely re-encrypt your entire vault with a new master password from the **Security** tab.

---

*FamilyNotes is open source software licensed under the **MIT License**. Enjoy complete privacy and effortless household coordination!*
