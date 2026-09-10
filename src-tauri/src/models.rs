use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ShoppingItem {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub text: String,
    #[serde(default)]
    pub quantity: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub emoji: Option<String>,
    #[serde(default)]
    pub checked: bool,
    #[serde(default)]
    pub checked_at: Option<String>,
    #[serde(default)]
    pub checked_by: Option<String>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ShoppingList {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub icon: String,
    #[serde(default)]
    pub items: Vec<ShoppingItem>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(default)]
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Note {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub pinned: bool,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
    #[serde(default)]
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseHistoryItem {
    pub text: String,
    pub emoji: String,
    pub category: String,
    pub count: u32,
    pub last_purchased_at: String,
    pub avg_interval_days: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FamilyMember {
    pub id: String,
    pub name: String,
    pub device_id: String,
    pub color: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SyncConfig {
    pub enabled: bool,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub remote_dir: String,
    pub remote_file: String,
    pub auto_sync: bool,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            protocol: "ftp".to_string(),
            host: String::new(),
            port: 21,
            username: String::new(),
            password: String::new(),
            remote_dir: "familynotes".to_string(),
            remote_file: "vault.fnvault".to_string(),
            auto_sync: true,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultData {
    #[serde(default)]
    pub revision: u64,
    #[serde(default)]
    pub device_id: String,
    #[serde(default)]
    pub device_name: String,
    #[serde(default)]
    pub shopping_lists: Vec<ShoppingList>,
    #[serde(default)]
    pub notes: Vec<Note>,
    #[serde(default)]
    pub purchase_history: Vec<PurchaseHistoryItem>,
    #[serde(default)]
    pub deleted_history_items: Vec<String>,
    #[serde(default)]
    pub catalog: Vec<ProductCatalogItem>,
    #[serde(default = "default_sync_config")]
    pub sync: SyncConfig,
    #[serde(default)]
    pub members: Vec<FamilyMember>,
    #[serde(default)]
    pub deleted_member_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ProductCatalogItem {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub keywords: Vec<String>,
    pub emoji: String,
    pub category: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct VaultProfile {
    pub id: String,
    pub name: String,
    pub file_path: String,
    pub icon: String,
    #[serde(default)]
    pub saved_master_password: Option<String>,
}

fn default_sync_config() -> SyncConfig {
    SyncConfig::default()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KdfParams {
    pub algorithm: String,
    pub memory_kib: u32,
    pub iterations: u32,
    pub parallelism: u32,
    pub salt: String,
    pub output_len: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CipherInfo {
    pub algorithm: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultHeader {
    pub magic: String,
    pub version: u32,
    pub vault_id: String,
    pub kdf: KdfParams,
    pub cipher: CipherInfo,
    pub nonce: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEnvelope {
    pub header: VaultHeader,
    pub payload: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultStatus {
    pub vault_id: String,
    pub revision: u64,
    pub lists_count: usize,
    pub notes_count: usize,
    pub items_count: usize,
    pub device_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultSnapshot {
    pub status: VaultStatus,
    pub contents: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preferences {
    pub theme: String,
    pub language: String,
    pub current_device_name: String,
    pub current_device_id: String,
    pub saved_master_password: Option<String>,
    pub vault_file_path: Option<String>,
    #[serde(default)]
    pub active_vault_id: Option<String>,
    #[serde(default)]
    pub vaults: Vec<VaultProfile>,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            language: "system".to_string(),
            current_device_name: "Mi Dispositivo".to_string(),
            current_device_id: uuid::Uuid::new_v4().to_string(),
            saved_master_password: None,
            vault_file_path: None,
            active_vault_id: None,
            vaults: Vec::new(),
        }
    }
}
