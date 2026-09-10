use std::collections::HashSet;
use std::sync::Mutex;
use tauri::State;
use uuid::Uuid;
use zeroize::Zeroizing;

use crate::{
    crypto::{default_cipher_info, default_kdf_params, derive_key, now_iso, open_payload, seal_payload, VAULT_MAGIC},
    models::{
        FamilyMember, Note, ProductCatalogItem, PurchaseHistoryItem, ShoppingItem, ShoppingList,
        SyncConfig, VaultData, VaultEnvelope, VaultHeader, VaultSnapshot, VaultStatus,
    },
    sync,
};

#[derive(Default)]
pub struct VaultManager {
    pub key: Option<Zeroizing<[u8; 32]>>,
    pub header: Option<VaultHeader>,
    pub data: Option<VaultData>,
    pub raw_contents: Option<String>,
    pub master_password: Option<String>,
}

impl VaultManager {
    #[allow(dead_code)]
    pub fn is_unlocked(&self) -> bool {
        self.key.is_some() && self.data.is_some() && self.header.is_some()
    }

    pub fn status(&self) -> Result<VaultStatus, String> {
        let header = self.header.as_ref().ok_or("vault_locked")?;
        let data = self.data.as_ref().ok_or("vault_locked")?;

        let items_count = data.shopping_lists.iter().map(|l| l.items.len()).sum();

        Ok(VaultStatus {
            vault_id: header.vault_id.clone(),
            revision: data.revision,
            lists_count: data.shopping_lists.len(),
            notes_count: data.notes.len(),
            items_count,
            device_name: data.device_name.clone(),
        })
    }

    pub fn seal_current(&mut self) -> Result<VaultSnapshot, String> {
        let key = self.key.as_ref().ok_or("vault_locked")?;
        let mut header = self.header.clone().ok_or("vault_locked")?;
        let data = self.data.as_ref().ok_or("vault_locked")?;

        header.updated_at = now_iso();
        let payload = seal_payload(data, &mut header, &key[..])?;

        let envelope = VaultEnvelope {
            header: header.clone(),
            payload,
        };

        let contents = serde_json::to_string_pretty(&envelope).map_err(|e| e.to_string())?;
        self.header = Some(header);
        self.raw_contents = Some(contents.clone());

        let status = self.status()?;
        Ok(VaultSnapshot { status, contents })
    }
}

pub type VaultState = Mutex<VaultManager>;

fn seed_sample_data(device_name: &str, device_id: &str) -> VaultData {
    let now = now_iso();
    VaultData {
        revision: 1,
        device_id: device_id.to_string(),
        device_name: device_name.to_string(),
        shopping_lists: vec![
            ShoppingList {
                id: Uuid::new_v4().to_string(),
                name: "Mercadona".to_string(),
                color: "#10b981".to_string(),
                icon: "cart".to_string(),
                items: vec![
                    ShoppingItem {
                        id: Uuid::new_v4().to_string(),
                        text: "Leche entera".to_string(),
                        quantity: Some("2 packs".to_string()),
                        category: Some("Lácteos".to_string()),
                        emoji: Some("🥛".to_string()),
                        checked: false,
                        checked_at: None,
                        checked_by: None,
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    },
                    ShoppingItem {
                        id: Uuid::new_v4().to_string(),
                        text: "Huevos camperos".to_string(),
                        quantity: Some("1 docena".to_string()),
                        category: Some("Frescos".to_string()),
                        emoji: Some("🥚".to_string()),
                        checked: false,
                        checked_at: None,
                        checked_by: None,
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    },
                    ShoppingItem {
                        id: Uuid::new_v4().to_string(),
                        text: "Aguacates maduros".to_string(),
                        quantity: Some("3 uds".to_string()),
                        category: Some("Frutería".to_string()),
                        emoji: Some("🥑".to_string()),
                        checked: false,
                        checked_at: None,
                        checked_by: None,
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    },
                    ShoppingItem {
                        id: Uuid::new_v4().to_string(),
                        text: "Arroz bomba 1kg".to_string(),
                        quantity: Some("1 paquete".to_string()),
                        category: Some("Despensa".to_string()),
                        emoji: Some("🍚".to_string()),
                        checked: true,
                        checked_at: Some(now.clone()),
                        checked_by: Some(device_name.to_string()),
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    },
                ],
                created_at: now.clone(),
                updated_at: now.clone(),
                archived: false,
            },
            ShoppingList {
                id: Uuid::new_v4().to_string(),
                name: "Lidl & Frutería".to_string(),
                color: "#38bdf8".to_string(),
                icon: "store".to_string(),
                items: vec![
                    ShoppingItem {
                        id: Uuid::new_v4().to_string(),
                        text: "Plátanos de Canarias".to_string(),
                        quantity: Some("1 kg".to_string()),
                        category: Some("Frutería".to_string()),
                        emoji: Some("🍌".to_string()),
                        checked: false,
                        checked_at: None,
                        checked_by: None,
                        created_at: now.clone(),
                        updated_at: now.clone(),
                    },
                ],
                created_at: now.clone(),
                updated_at: now.clone(),
                archived: false,
            },
        ],
        notes: vec![
            Note {
                id: Uuid::new_v4().to_string(),
                title: "🥘 Receta Paella Valenciana".to_string(),
                content: "- 500g arroz bomba\n- Pollo y conejo troceado\n- Judías verdes (bajoqueta) y garrofó\n- Tomate triturado, azafrán y romero\n- Fuego vivo 8 min, fuego suave 10 min.".to_string(),
                color: "#f59e0b".to_string(),
                pinned: true,
                created_at: now.clone(),
                updated_at: now.clone(),
                archived: false,
            },
            Note {
                id: Uuid::new_v4().to_string(),
                title: "💡 Tareas de Casa Fin de Semana".to_string(),
                content: "1. Limpiar filtro lavadora\n2. Comprar bombillas LED salón\n3. Revisar presión neumáticos coche".to_string(),
                color: "#8b5cf6".to_string(),
                pinned: false,
                created_at: now.clone(),
                updated_at: now.clone(),
                archived: false,
            },
        ],
        purchase_history: vec![
            PurchaseHistoryItem {
                text: "Leche entera".to_string(),
                emoji: "🥛".to_string(),
                category: "Lácteos".to_string(),
                count: 18,
                last_purchased_at: now.clone(),
                avg_interval_days: Some(8),
            },
            PurchaseHistoryItem {
                text: "Huevos camperos".to_string(),
                emoji: "🥚".to_string(),
                category: "Frescos".to_string(),
                count: 14,
                last_purchased_at: now.clone(),
                avg_interval_days: Some(10),
            },
            PurchaseHistoryItem {
                text: "Pan de molde".to_string(),
                emoji: "🍞".to_string(),
                category: "Panadería".to_string(),
                count: 12,
                last_purchased_at: now.clone(),
                avg_interval_days: Some(5),
            },
            PurchaseHistoryItem {
                text: "Plátanos de Canarias".to_string(),
                emoji: "🍌".to_string(),
                category: "Frutería".to_string(),
                count: 11,
                last_purchased_at: now.clone(),
                avg_interval_days: Some(7),
            },
            PurchaseHistoryItem {
                text: "Papel higiénico 24 rollos".to_string(),
                emoji: "🧻".to_string(),
                category: "Limpieza".to_string(),
                count: 7,
                last_purchased_at: now.clone(),
                avg_interval_days: Some(25),
            },
            PurchaseHistoryItem {
                text: "Arroz bomba 1kg".to_string(),
                emoji: "🍚".to_string(),
                category: "Despensa".to_string(),
                count: 6,
                last_purchased_at: now.clone(),
                avg_interval_days: Some(20),
            },
        ],
        catalog: Vec::new(),
        sync: SyncConfig::default(),
        members: vec![
            FamilyMember {
                id: Uuid::new_v4().to_string(),
                name: device_name.to_string(),
                device_id: device_id.to_string(),
                color: "#10b981".to_string(),
            },
        ],
        deleted_member_ids: Vec::new(),
    }
}

// -------------------------------------------------------------
// TAURI COMMANDS
// -------------------------------------------------------------

#[tauri::command]
pub fn create_vault(
    master_password: String,
    device_name: Option<String>,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    if master_password.trim().is_empty() {
        return Err("password_required".to_string());
    }

    let dev_name = device_name.unwrap_or_else(|| "Dispositivo Principal".to_string());
    let dev_id = Uuid::new_v4().to_string();

    let kdf = default_kdf_params();
    let key = derive_key(&master_password, &kdf)?;

    let now = now_iso();
    let mut header = VaultHeader {
        magic: VAULT_MAGIC.to_string(),
        version: 1,
        vault_id: Uuid::new_v4().to_string(),
        kdf,
        cipher: default_cipher_info(),
        nonce: String::new(),
        created_at: now.clone(),
        updated_at: now,
    };

    let data = seed_sample_data(&dev_name, &dev_id);
    let payload = seal_payload(&data, &mut header, &key[..])?;

    let envelope = VaultEnvelope {
        header: header.clone(),
        payload,
    };

    let contents = serde_json::to_string_pretty(&envelope).map_err(|e| e.to_string())?;

    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    mgr.key = Some(key);
    mgr.header = Some(header);
    mgr.data = Some(data);
    mgr.raw_contents = Some(contents.clone());
    mgr.master_password = Some(master_password);

    let status = mgr.status()?;
    Ok(VaultSnapshot { status, contents })
}

#[tauri::command]
pub fn unlock_vault(
    contents: String,
    master_password: String,
    state: State<'_, VaultState>,
) -> Result<VaultStatus, String> {
    let envelope: VaultEnvelope =
        serde_json::from_str(&contents).map_err(|_| "invalid_vault_format".to_string())?;

    if envelope.header.magic != VAULT_MAGIC {
        return Err("invalid_vault_magic".to_string());
    }

    let key = derive_key(&master_password, &envelope.header.kdf)?;
    let mut data: VaultData = open_payload(&envelope.payload, &envelope.header, &key[..])?;

    // Asegurar que ninguna lista existente tenga un ID vacío
    for l in &mut data.shopping_lists {
        if l.id.trim().is_empty() {
            l.id = Uuid::new_v4().to_string();
        }
    }

    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    mgr.key = Some(key);
    mgr.header = Some(envelope.header);
    mgr.data = Some(data);
    mgr.raw_contents = Some(contents);
    mgr.master_password = Some(master_password);

    mgr.status()
}

#[tauri::command]
pub fn lock_vault(state: State<'_, VaultState>) -> Result<(), String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    mgr.key = None;
    mgr.header = None;
    mgr.data = None;
    mgr.raw_contents = None;
    mgr.master_password = None;
    Ok(())
}

#[tauri::command]
pub fn get_vault_data(state: State<'_, VaultState>) -> Result<VaultData, String> {
    let mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    mgr.data.clone().ok_or_else(|| "vault_locked".to_string())
}

#[tauri::command]
pub fn save_vault(state: State<'_, VaultState>) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    if let Some(data) = mgr.data.as_mut() {
        data.revision += 1;
    }
    mgr.seal_current()
}

#[tauri::command]
pub fn upsert_shopping_list(
    mut list: ShoppingList,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    data.revision += 1;
    let now = now_iso();

    // Reparar cualquier lista existente que tuviera ID vacío
    for existing in &mut data.shopping_lists {
        if existing.id.trim().is_empty() {
            existing.id = Uuid::new_v4().to_string();
        }
    }

    if list.id.trim().is_empty() {
        list.id = Uuid::new_v4().to_string();
        if list.created_at.is_empty() {
            list.created_at = now.clone();
        }
        list.updated_at = now;
        data.shopping_lists.push(list);
    } else if let Some(pos) = data.shopping_lists.iter().position(|l| l.id == list.id) {
        list.updated_at = now;
        if list.items.is_empty() && !data.shopping_lists[pos].items.is_empty() {
            list.items = data.shopping_lists[pos].items.clone();
        }
        data.shopping_lists[pos] = list;
    } else {
        if list.created_at.is_empty() {
            list.created_at = now.clone();
        }
        list.updated_at = now;
        data.shopping_lists.push(list);
    }

    mgr.seal_current()
}

#[tauri::command]
pub fn delete_shopping_list(
    list_id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    data.revision += 1;
    data.shopping_lists.retain(|l| l.id != list_id);

    mgr.seal_current()
}

#[tauri::command]
pub fn upsert_shopping_item(
    list_id: String,
    mut item: ShoppingItem,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let now = now_iso();
    if item.id.is_empty() {
        item.id = Uuid::new_v4().to_string();
        item.created_at = now.clone();
    }
    item.updated_at = now;

    let list = data
        .shopping_lists
        .iter_mut()
        .find(|l| l.id == list_id)
        .ok_or("list_not_found")?;

    if let Some(pos) = list.items.iter().position(|i| i.id == item.id) {
        list.items[pos] = item.clone();
    } else {
        list.items.push(item.clone());
    }

    // Record in history
    let norm_name = item.text.trim();
    if !norm_name.is_empty() {
        if let Some(hist) = data.purchase_history.iter_mut().find(|h| h.text.eq_ignore_ascii_case(norm_name)) {
            hist.count += 1;
        } else {
            data.purchase_history.push(PurchaseHistoryItem {
                text: norm_name.to_string(),
                emoji: item.emoji.unwrap_or_else(|| "🛒".to_string()),
                category: item.category.unwrap_or_else(|| "General".to_string()),
                count: 1,
                last_purchased_at: now_iso(),
                avg_interval_days: Some(7),
            });
        }
    }

    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn toggle_shopping_item(
    list_id: String,
    item_id: String,
    checked_by: Option<String>,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let now = now_iso();
    let dev_name = data.device_name.clone();

    let list = data
        .shopping_lists
        .iter_mut()
        .find(|l| l.id == list_id)
        .ok_or("list_not_found")?;

    let item = list
        .items
        .iter_mut()
        .find(|i| i.id == item_id)
        .ok_or("item_not_found")?;

    item.checked = !item.checked;
    item.updated_at = now.clone();

    if item.checked {
        item.checked_at = Some(now.clone());
        item.checked_by = checked_by.or(Some(dev_name));

        // Update purchase frequency
        let norm_name = item.text.trim();
        if let Some(hist) = data.purchase_history.iter_mut().find(|h| h.text.eq_ignore_ascii_case(norm_name)) {
            hist.count += 1;
            hist.last_purchased_at = now;
        }
    } else {
        item.checked_at = None;
        item.checked_by = None;
    }

    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn delete_shopping_item(
    list_id: String,
    item_id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let list = data
        .shopping_lists
        .iter_mut()
        .find(|l| l.id == list_id)
        .ok_or("list_not_found")?;

    list.items.retain(|i| i.id != item_id);
    data.revision += 1;

    mgr.seal_current()
}

#[tauri::command]
pub fn clear_completed_items(
    list_id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let list = data
        .shopping_lists
        .iter_mut()
        .find(|l| l.id == list_id)
        .ok_or("list_not_found")?;

    list.items.retain(|i| !i.checked);
    data.revision += 1;

    mgr.seal_current()
}

#[tauri::command]
pub fn upsert_note(
    mut note: Note,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let now = now_iso();
    if note.id.is_empty() {
        note.id = Uuid::new_v4().to_string();
        note.created_at = now.clone();
    }
    note.updated_at = now;

    if let Some(pos) = data.notes.iter().position(|n| n.id == note.id) {
        data.notes[pos] = note;
    } else {
        data.notes.insert(0, note);
    }

    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn delete_note(
    note_id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    data.notes.retain(|n| n.id != note_id);
    data.revision += 1;

    mgr.seal_current()
}

#[tauri::command]
pub fn change_master_password(
    old_password: String,
    new_password: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    if new_password.trim().is_empty() {
        return Err("new_password_required".to_string());
    }

    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let current_pass = mgr.master_password.as_deref().unwrap_or("");
    if current_pass != old_password {
        return Err("invalid_old_password".to_string());
    }

    let kdf = default_kdf_params();
    let new_key = derive_key(&new_password, &kdf)?;

    if let Some(header) = mgr.header.as_mut() {
        header.kdf = kdf;
        header.updated_at = now_iso();
    }

    mgr.key = Some(new_key);
    mgr.master_password = Some(new_password);

    mgr.seal_current()
}

#[tauri::command]
pub fn get_sync_config(state: State<'_, VaultState>) -> Result<SyncConfig, String> {
    let mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_ref().ok_or_else(|| "vault_locked".to_string())?;
    Ok(data.sync.clone())
}

#[tauri::command]
pub fn set_sync_config(
    config: SyncConfig,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    data.sync = config;
    data.revision += 1;

    mgr.seal_current()
}

#[tauri::command]
pub fn test_sync(config: SyncConfig) -> Result<(), String> {
    sync::test_connection(&config)
}

fn merge_shopping_lists(
    primary: &[ShoppingList],
    secondary: &[ShoppingList],
) -> Vec<ShoppingList> {
    let mut result = primary.to_vec();

    for sec_list in secondary {
        if let Some(pri_list) = result.iter_mut().find(|l| l.id == sec_list.id) {
            for sec_item in &sec_list.items {
                if let Some(pri_item) = pri_list.items.iter_mut().find(|i| i.id == sec_item.id) {
                    if sec_item.updated_at > pri_item.updated_at {
                        *pri_item = sec_item.clone();
                    }
                } else {
                    pri_list.items.push(sec_item.clone());
                }
            }
        } else {
            result.push(sec_list.clone());
        }
    }

    result
}

fn merge_notes(primary: &[Note], secondary: &[Note]) -> Vec<Note> {
    let mut result = primary.to_vec();
    for sec_note in secondary {
        if let Some(pri_note) = result.iter_mut().find(|n| n.id == sec_note.id) {
            if sec_note.updated_at > pri_note.updated_at {
                *pri_note = sec_note.clone();
            }
        } else {
            result.push(sec_note.clone());
        }
    }
    result
}

fn merge_purchase_history(
    primary: &[PurchaseHistoryItem],
    secondary: &[PurchaseHistoryItem],
) -> Vec<PurchaseHistoryItem> {
    let mut result = primary.to_vec();
    for sec_item in secondary {
        let sec_key = sec_item.text.trim().to_lowercase();
        if let Some(pri_item) = result.iter_mut().find(|i| i.text.trim().to_lowercase() == sec_key) {
            pri_item.count = std::cmp::max(pri_item.count, sec_item.count);
            if sec_item.last_purchased_at > pri_item.last_purchased_at {
                pri_item.last_purchased_at = sec_item.last_purchased_at.clone();
            }
        } else {
            result.push(sec_item.clone());
        }
    }
    result
}

fn merge_catalog(
    primary: &[ProductCatalogItem],
    secondary: &[ProductCatalogItem],
) -> Vec<ProductCatalogItem> {
    let mut result = primary.to_vec();
    for sec_item in secondary {
        let sec_name = sec_item.name.trim().to_lowercase();
        if !result.iter().any(|i| i.id == sec_item.id || i.name.trim().to_lowercase() == sec_name) {
            result.push(sec_item.clone());
        }
    }
    result
}

#[tauri::command]
pub fn sync_now(state: State<'_, VaultState>) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let cfg = {
        let data = mgr.data.as_ref().ok_or_else(|| "vault_locked".to_string())?;
        data.sync.clone()
    };

    if !cfg.enabled || cfg.host.trim().is_empty() {
        return Err("sync_not_configured".to_string());
    }

    let key = mgr.key.as_ref().ok_or("vault_locked")?;

    // 1. Download remote file if exists
    let remote_bytes = sync::download(&cfg)?;

    if let Some(bytes) = remote_bytes {
        let remote_str = String::from_utf8(bytes).map_err(|_| "remote_not_utf8".to_string())?;

        // If remote file is bit-for-bit identical to our local raw contents, no merge or upload needed
        if mgr.raw_contents.as_deref() == Some(&remote_str) {
            let status = mgr.status()?;
            return Ok(VaultSnapshot {
                status,
                contents: remote_str,
            });
        }

        let remote_env: VaultEnvelope =
            serde_json::from_str(&remote_str).map_err(|_| "remote_invalid_format".to_string())?;

        let remote_data: VaultData =
            open_payload(&remote_env.payload, &remote_env.header, &key[..])?;

        if let Some(local_data) = mgr.data.as_mut() {
            // Merge deleted_member_ids
            let mut all_deleted: HashSet<String> = local_data
                .deleted_member_ids
                .iter()
                .cloned()
                .collect();
            for d in &remote_data.deleted_member_ids {
                all_deleted.insert(d.clone());
            }

            // Merge members: filter out deleted ones
            let mut merged_members: Vec<FamilyMember> = Vec::new();
            let mut seen_ids: HashSet<String> = HashSet::new();

            let (primary_members, secondary_members) = if remote_data.revision >= local_data.revision {
                (&remote_data.members, &local_data.members)
            } else {
                (&local_data.members, &remote_data.members)
            };

            for m in primary_members.iter().chain(secondary_members.iter()) {
                if all_deleted.contains(&m.id) || all_deleted.contains(&m.device_id) {
                    continue;
                }
                let norm_name = m.name.trim().to_lowercase();
                if !seen_ids.contains(&m.id)
                    && (m.device_id.is_empty() || !seen_ids.contains(&m.device_id))
                    && !seen_ids.contains(&norm_name)
                {
                    seen_ids.insert(m.id.clone());
                    if !m.device_id.is_empty() {
                        seen_ids.insert(m.device_id.clone());
                    }
                    seen_ids.insert(norm_name);
                    merged_members.push(m.clone());
                }
            }

            // Merge lists, notes, history, catalog
            let (pri_lists, sec_lists) = if remote_data.revision >= local_data.revision {
                (&remote_data.shopping_lists, &local_data.shopping_lists)
            } else {
                (&local_data.shopping_lists, &remote_data.shopping_lists)
            };
            let merged_lists = merge_shopping_lists(pri_lists, sec_lists);

            let (pri_notes, sec_notes) = if remote_data.revision >= local_data.revision {
                (&remote_data.notes, &local_data.notes)
            } else {
                (&local_data.notes, &remote_data.notes)
            };
            let merged_notes = merge_notes(pri_notes, sec_notes);

            let (pri_hist, sec_hist) = if remote_data.revision >= local_data.revision {
                (&remote_data.purchase_history, &local_data.purchase_history)
            } else {
                (&local_data.purchase_history, &remote_data.purchase_history)
            };
            let merged_hist = merge_purchase_history(pri_hist, sec_hist);

            let (pri_cat, sec_cat) = if remote_data.revision >= local_data.revision {
                (&remote_data.catalog, &local_data.catalog)
            } else {
                (&local_data.catalog, &remote_data.catalog)
            };
            let merged_cat = merge_catalog(pri_cat, sec_cat);

            local_data.revision = std::cmp::max(local_data.revision, remote_data.revision) + 1;
            local_data.members = merged_members;
            local_data.deleted_member_ids = all_deleted.into_iter().collect();
            local_data.shopping_lists = merged_lists;
            local_data.notes = merged_notes;
            local_data.purchase_history = merged_hist;
            local_data.catalog = merged_cat;
        }
    }

    // 2. Seal merged data and upload
    let snapshot = mgr.seal_current()?;
    sync::upload(&cfg, snapshot.contents.as_bytes())?;
    mgr.raw_contents = Some(snapshot.contents.clone());

    Ok(snapshot)
}

#[tauri::command]
pub fn link_via_ftp(
    config: SyncConfig,
    master_password: String,
    device_name: Option<String>,
    device_id: Option<String>,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    if master_password.trim().is_empty() {
        return Err("password_required".to_string());
    }

    // 1. Download vault from FTP
    let remote_bytes = sync::download(&config)?
        .ok_or_else(|| "vault_file_not_found_on_ftp".to_string())?;

    let remote_str = String::from_utf8(remote_bytes).map_err(|_| "remote_not_utf8".to_string())?;
    let envelope: VaultEnvelope =
        serde_json::from_str(&remote_str).map_err(|_| "invalid_vault_format".to_string())?;

    if envelope.header.magic != VAULT_MAGIC {
        return Err("invalid_vault_magic".to_string());
    }

    // 2. Derive key and open payload with master password
    let key = derive_key(&master_password, &envelope.header.kdf)?;
    let mut data: VaultData = open_payload(&envelope.payload, &envelope.header, &key[..])?;

    // 3. Register member / device if provided
    let dev_name = device_name.unwrap_or_else(|| "Nuevo Dispositivo".to_string());
    let dev_id = device_id.unwrap_or_else(|| Uuid::new_v4().to_string());

    // Remove from deleted_member_ids if present because it is explicitly re-authorized with master password
    data.deleted_member_ids.retain(|d| d != &dev_id && !d.eq_ignore_ascii_case(&dev_name));

    if let Some(existing) = data.members.iter_mut().find(|m| m.device_id == dev_id || m.name.eq_ignore_ascii_case(&dev_name)) {
        existing.name = dev_name.clone();
        existing.device_id = dev_id.clone();
    } else {
        data.members.push(FamilyMember {
            id: Uuid::new_v4().to_string(),
            name: dev_name.clone(),
            device_id: dev_id.clone(),
            color: "#38bdf8".to_string(),
        });
    }

    data.device_name = dev_name;
    data.device_id = dev_id;
    data.sync = config.clone();
    data.revision += 1;

    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    mgr.key = Some(key);
    mgr.header = Some(envelope.header);
    mgr.data = Some(data);
    mgr.raw_contents = Some(remote_str);
    mgr.master_password = Some(master_password);

    let snapshot = mgr.seal_current()?;

    // Immediately upload to FTP so the newly linked device is registered on the server for other family devices!
    let _ = sync::upload(&config, snapshot.contents.as_bytes());

    Ok(snapshot)
}

#[tauri::command]
pub fn write_vault_file(path: String, contents: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("failed_create_dir: {}", e))?;
    }
    std::fs::write(&path, contents).map_err(|e| format!("failed_write_file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn read_vault_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("failed_read_file: {}", e))
}

#[tauri::command]
pub fn vault_file_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
pub fn delete_vault_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.exists() {
        std::fs::remove_file(p).map_err(|e| format!("failed_delete_file: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_default_vaults_dir(app: tauri::AppHandle) -> Result<String, String> {
    use tauri::Manager;
    let dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("vaults");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn upsert_catalog_item(
    item: crate::models::ProductCatalogItem,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let item_id = if item.id.is_empty() {
        Uuid::new_v4().to_string()
    } else {
        item.id.clone()
    };

    let mut new_item = item;
    new_item.id = item_id.clone();

    if let Some(idx) = data.catalog.iter().position(|c| c.id == item_id) {
        data.catalog[idx] = new_item;
    } else {
        data.catalog.push(new_item);
    }

    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn delete_catalog_item(
    id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    data.catalog.retain(|c| c.id != id);
    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn clear_purchase_history(
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    data.purchase_history.clear();
    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn delete_family_member(
    id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    if let Some(pos) = data.members.iter().position(|m| m.id == id || m.device_id == id) {
        let member = data.members.remove(pos);
        if !data.deleted_member_ids.contains(&member.id) {
            data.deleted_member_ids.push(member.id);
        }
        if !member.device_id.is_empty() && !data.deleted_member_ids.contains(&member.device_id) {
            data.deleted_member_ids.push(member.device_id);
        }
    } else {
        if !data.deleted_member_ids.contains(&id) {
            data.deleted_member_ids.push(id);
        }
    }

    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn register_family_member(
    name: String,
    device_id: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    // Un-revoke if previously marked as deleted
    data.deleted_member_ids.retain(|d| d != &device_id && !d.eq_ignore_ascii_case(&name));

    if let Some(existing) = data.members.iter_mut().find(|m| m.device_id == device_id || m.name.eq_ignore_ascii_case(&name)) {
        existing.name = name;
        existing.device_id = device_id;
    } else {
        data.members.push(crate::models::FamilyMember {
            id: Uuid::new_v4().to_string(),
            name,
            device_id,
            color: "#38bdf8".to_string(),
        });
    }

    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn delete_purchase_history_item(
    text: String,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let norm_target = text.trim().to_lowercase();
    data.purchase_history.retain(|p| p.text.trim().to_lowercase() != norm_target);
    data.revision += 1;
    mgr.seal_current()
}

#[tauri::command]
pub fn reorder_shopping_lists(
    list_ids: Vec<String>,
    state: State<'_, VaultState>,
) -> Result<VaultSnapshot, String> {
    let mut mgr = state.lock().map_err(|_| "mutex_lock_failed")?;
    let data = mgr.data.as_mut().ok_or_else(|| "vault_locked".to_string())?;

    let mut new_lists = Vec::with_capacity(data.shopping_lists.len());
    for id in &list_ids {
        if let Some(idx) = data.shopping_lists.iter().position(|l| &l.id == id) {
            new_lists.push(data.shopping_lists.remove(idx));
        }
    }
    new_lists.append(&mut data.shopping_lists);
    data.shopping_lists = new_lists;
    data.revision += 1;
    mgr.seal_current()
}
