mod crypto;
mod models;
mod preferences;
mod sync;
mod vault;

use std::sync::Mutex;
use vault::VaultManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(VaultManager::default()))
        .invoke_handler(tauri::generate_handler![
            vault::create_vault,
            vault::unlock_vault,
            vault::lock_vault,
            vault::get_vault_data,
            vault::save_vault,
            vault::upsert_shopping_list,
            vault::delete_shopping_list,
            vault::upsert_shopping_item,
            vault::toggle_shopping_item,
            vault::delete_shopping_item,
            vault::clear_completed_items,
            vault::upsert_note,
            vault::delete_note,
            vault::change_master_password,
            vault::get_sync_config,
            vault::set_sync_config,
            vault::test_sync,
            vault::sync_now,
            vault::link_via_ftp,
            vault::write_vault_file,
            vault::read_vault_file,
            vault::vault_file_exists,
            vault::delete_vault_file,
            vault::get_default_vaults_dir,
            vault::upsert_catalog_item,
            vault::delete_catalog_item,
            vault::clear_purchase_history,
            preferences::get_preferences,
            preferences::save_preferences,
        ])
        .run(tauri::generate_context!())
        .expect("error while running FamilyNotes");
}
