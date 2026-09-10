export interface ShoppingItem {
  id: string;
  text: string;
  quantity?: string | null;
  category?: string | null;
  emoji?: string | null;
  checked: boolean;
  checkedAt?: string | null;
  checkedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  color: string;
  icon: string;
  items: ShoppingItem[];
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
}

export interface PurchaseHistoryItem {
  text: string;
  emoji: string;
  category: string;
  count: number;
  lastPurchasedAt: string;
  avgIntervalDays?: number | null;
}

export interface FamilyMember {
  id: string;
  name: string;
  deviceId: string;
  color: string;
}

export interface SyncConfig {
  enabled: boolean;
  protocol: string;
  host: string;
  port: number;
  username: string;
  password: string;
  remoteDir: string;
  remoteFile: string;
  autoSync: boolean;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  keywords: string[];
  emoji: string;
  category: string;
}

export interface VaultData {
  revision: number;
  deviceId: string;
  deviceName: string;
  shoppingLists: ShoppingList[];
  notes: Note[];
  purchaseHistory: PurchaseHistoryItem[];
  catalog: ProductCatalogItem[];
  sync: SyncConfig;
  members: FamilyMember[];
}

export interface VaultStatus {
  vaultId: string;
  revision: number;
  listsCount: number;
  notesCount: number;
  itemsCount: number;
  deviceName: string;
}

export interface VaultSnapshot {
  status: VaultStatus;
  contents: string;
}

export interface VaultProfile {
  id: string;
  name: string;
  filePath: string;
  icon: string;
  savedMasterPassword?: string | null;
}

export interface Preferences {
  theme: string;
  language: string;
  currentDeviceName: string;
  currentDeviceId: string;
  savedMasterPassword?: string | null;
  vaultFilePath?: string | null;
  activeVaultId?: string | null;
  vaults: VaultProfile[];
}
