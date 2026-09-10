import { invoke } from "@tauri-apps/api/core";
import {
  Note,
  Preferences,
  ProductCatalogItem,
  ShoppingItem,
  ShoppingList,
  SyncConfig,
  VaultData,
  VaultSnapshot,
  VaultStatus,
} from "./types";

const Api = {
  getPreferences: () => invoke<Preferences>("get_preferences"),
  savePreferences: (preferences: Preferences) =>
    invoke<Preferences>("save_preferences", { preferences }),

  createVault: (masterPassword: string, deviceName?: string) =>
    invoke<VaultSnapshot>("create_vault", { masterPassword, deviceName }),

  unlockVault: (contents: string, masterPassword: string) =>
    invoke<VaultStatus>("unlock_vault", { contents, masterPassword }),

  lockVault: () => invoke<void>("lock_vault"),

  getVaultData: () => invoke<VaultData>("get_vault_data"),

  saveVault: () => invoke<VaultSnapshot>("save_vault"),

  upsertShoppingList: (list: ShoppingList) =>
    invoke<VaultSnapshot>("upsert_shopping_list", { list }),

  deleteShoppingList: (listId: string) =>
    invoke<VaultSnapshot>("delete_shopping_list", { listId }),

  upsertShoppingItem: (listId: string, item: ShoppingItem) =>
    invoke<VaultSnapshot>("upsert_shopping_item", { listId, item }),

  toggleShoppingItem: (listId: string, itemId: string, checkedBy?: string) =>
    invoke<VaultSnapshot>("toggle_shopping_item", { listId, itemId, checkedBy }),

  deleteShoppingItem: (listId: string, itemId: string) =>
    invoke<VaultSnapshot>("delete_shopping_item", { listId, itemId }),

  clearCompletedItems: (listId: string) =>
    invoke<VaultSnapshot>("clear_completed_items", { listId }),

  upsertNote: (note: Note) => invoke<VaultSnapshot>("upsert_note", { note }),

  deleteNote: (noteId: string) => invoke<VaultSnapshot>("delete_note", { noteId }),

  changeMasterPassword: (oldPassword: string, newPassword: string) =>
    invoke<VaultSnapshot>("change_master_password", { oldPassword, newPassword }),

  getSyncConfig: () => invoke<SyncConfig>("get_sync_config"),

  setSyncConfig: (config: SyncConfig) =>
    invoke<VaultSnapshot>("set_sync_config", { config }),

  testSync: (config: SyncConfig) => invoke<void>("test_sync", { config }),

  syncNow: () => invoke<VaultSnapshot>("sync_now"),

  linkViaFtp: (config: SyncConfig, masterPassword: string, deviceName?: string, deviceId?: string) =>
    invoke<VaultSnapshot>("link_via_ftp", { config, masterPassword, deviceName, deviceId }),

  // Native File Persistence (No plugin-fs sandbox restrictions!)
  writeVaultFile: (path: string, contents: string) =>
    invoke<void>("write_vault_file", { path, contents }),

  readVaultFile: (path: string) =>
    invoke<string>("read_vault_file", { path }),

  vaultFileExists: (path: string) =>
    invoke<boolean>("vault_file_exists", { path }),

  deleteVaultFile: (path: string) =>
    invoke<void>("delete_vault_file", { path }),

  getDefaultVaultsDir: () =>
    invoke<string>("get_default_vaults_dir"),

  // Catalog / Dictionary Management
  upsertCatalogItem: (item: ProductCatalogItem) =>
    invoke<VaultSnapshot>("upsert_catalog_item", { item }),

  deleteCatalogItem: (id: string) =>
    invoke<VaultSnapshot>("delete_catalog_item", { id }),
  clearPurchaseHistory: () =>
    invoke<VaultSnapshot>("clear_purchase_history"),
  deletePurchaseHistoryItem: (text: string) =>
    invoke<VaultSnapshot>("delete_purchase_history_item", { text }),
  deleteFamilyMember: (id: string) =>
    invoke<VaultSnapshot>("delete_family_member", { id }),
  registerFamilyMember: (name: string, deviceId: string) =>
    invoke<VaultSnapshot>("register_family_member", { name, deviceId }),
  reorderShoppingLists: (listIds: string[]) =>
    invoke<VaultSnapshot>("reorder_shopping_lists", { listIds }),
};

export default Api;
