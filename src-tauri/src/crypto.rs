use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose, Engine as _};
use chacha20poly1305::{
    aead::{Aead, KeyInit, Payload},
    XChaCha20Poly1305,
};
use chrono::{SecondsFormat, Utc};
use rand_core::{OsRng, RngCore};
use serde::{de::DeserializeOwned, Serialize};
use zeroize::Zeroizing;

use crate::models::{CipherInfo, KdfParams, VaultHeader};

pub const VAULT_MAGIC: &str = "familynotes-vault-v1";

pub fn now_iso() -> String {
    Utc::now().to_rfc3339_opts(SecondsFormat::Millis, true)
}

pub fn encode_b64(data: &[u8]) -> String {
    general_purpose::STANDARD.encode(data)
}

pub fn decode_b64(data: &str) -> Result<Vec<u8>, String> {
    general_purpose::STANDARD
        .decode(data.as_bytes())
        .map_err(|_| "invalid_base64".to_string())
}

pub fn random_bytes(len: usize) -> Vec<u8> {
    let mut bytes = vec![0u8; len];
    OsRng.fill_bytes(&mut bytes);
    bytes
}

pub fn default_kdf_params() -> KdfParams {
    let memory_kib = if cfg!(target_os = "android") { 32 * 1024 } else { 64 * 1024 };
    KdfParams {
        algorithm: "Argon2id".to_string(),
        memory_kib,
        iterations: 3,
        parallelism: 1,
        salt: encode_b64(&random_bytes(16)),
        output_len: 32,
    }
}

pub fn default_cipher_info() -> CipherInfo {
    CipherInfo {
        algorithm: "XChaCha20-Poly1305".to_string(),
    }
}

pub fn derive_key(password: &str, params: &KdfParams) -> Result<Zeroizing<[u8; 32]>, String> {
    if params.algorithm != "Argon2id" || params.output_len != 32 {
        return Err("unsupported_kdf".to_string());
    }

    let salt = decode_b64(&params.salt)?;
    let argon_params = Params::new(
        params.memory_kib,
        params.iterations,
        params.parallelism,
        Some(params.output_len as usize),
    )
    .map_err(|_| "invalid_kdf_params".to_string())?;

    let mut key = Zeroizing::new([0u8; 32]);
    Argon2::new(Algorithm::Argon2id, Version::V0x13, argon_params)
        .hash_password_into(password.as_bytes(), &salt, &mut key[..])
        .map_err(|_| "key_derivation_failed".to_string())?;

    Ok(key)
}

pub fn seal_payload<T: Serialize>(
    value: &T,
    header: &mut VaultHeader,
    key: &[u8],
) -> Result<String, String> {
    let nonce = random_bytes(24);
    header.nonce = encode_b64(&nonce);

    let aad = serde_json::to_vec(header).map_err(|e| e.to_string())?;
    let plaintext = Zeroizing::new(serde_json::to_vec(value).map_err(|e| e.to_string())?);
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| "invalid_key".to_string())?;
    let encrypted = cipher
        .encrypt(
            nonce.as_slice().into(),
            Payload {
                msg: &plaintext,
                aad: &aad,
            },
        )
        .map_err(|_| "encryption_failed".to_string())?;

    Ok(encode_b64(&encrypted))
}

pub fn open_payload<T: DeserializeOwned>(
    payload: &str,
    header: &VaultHeader,
    key: &[u8],
) -> Result<T, String> {
    let nonce = decode_b64(&header.nonce)?;
    if nonce.len() != 24 {
        return Err("invalid_nonce".to_string());
    }

    let aad = serde_json::to_vec(header).map_err(|e| e.to_string())?;
    let encrypted = decode_b64(payload)?;
    let cipher = XChaCha20Poly1305::new_from_slice(key).map_err(|_| "invalid_key".to_string())?;
    let decrypted = Zeroizing::new(
        cipher
            .decrypt(
                nonce.as_slice().into(),
                Payload {
                    msg: &encrypted,
                    aad: &aad,
                },
            )
            .map_err(|_| "decryption_failed".to_string())?,
    );

    serde_json::from_slice(&decrypted).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{ShoppingList, VaultData};

    #[test]
    fn crypto_round_trip() {
        let mut kdf = default_kdf_params();
        kdf.memory_kib = 1024; // fast in tests
        let key = derive_key("family_password_123", &kdf).expect("key");

        let mut header = VaultHeader {
            magic: VAULT_MAGIC.to_string(),
            version: 1,
            vault_id: "test-id".to_string(),
            kdf,
            cipher: default_cipher_info(),
            nonce: String::new(),
            created_at: now_iso(),
            updated_at: now_iso(),
        };

        let data = VaultData {
            revision: 1,
            device_id: "dev-1".to_string(),
            device_name: "Test Phone".to_string(),
            shopping_lists: vec![ShoppingList {
                id: "list-1".to_string(),
                name: "Mercadona".to_string(),
                color: "#10b981".to_string(),
                icon: "cart".to_string(),
                items: vec![],
                created_at: now_iso(),
                updated_at: now_iso(),
                archived: false,
            }],
            notes: vec![],
            purchase_history: vec![],
            deleted_history_items: vec![],
            catalog: vec![],
            sync: Default::default(),
            members: vec![],
            deleted_member_ids: vec![],
        };

        let ciphertext = seal_payload(&data, &mut header, &key[..]).expect("seal");
        let decrypted: VaultData = open_payload(&ciphertext, &header, &key[..]).expect("open");
        assert_eq!(decrypted.shopping_lists.len(), 1);
        assert_eq!(decrypted.shopping_lists[0].name, "Mercadona");
    }
}
