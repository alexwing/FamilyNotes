use std::io::Cursor;
use suppaftp::FtpStream;
use crate::models::SyncConfig;

const HTACCESS: &str = "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n</IfModule>\nOptions -Indexes\n";
const DEFAULT_FILE: &str = "family_notes.fnvault";

fn remote_file(cfg: &SyncConfig) -> String {
    let file = cfg.remote_file.trim();
    if file.is_empty() {
        DEFAULT_FILE.to_string()
    } else {
        file.to_string()
    }
}

fn connect(cfg: &SyncConfig) -> Result<FtpStream, String> {
    let host = cfg.host.trim();
    if host.is_empty() {
        return Err("sync_host_required".to_string());
    }
    let addr = format!("{}:{}", host, cfg.port);
    let mut ftp = FtpStream::connect(&addr).map_err(|e| format!("sync_connect_failed: {}", e))?;
    ftp.login(cfg.username.trim(), &cfg.password)
        .map_err(|e| format!("sync_auth_failed: {}", e))?;
    Ok(ftp)
}

fn enter_dir(ftp: &mut FtpStream, dir: &str) -> Result<(), String> {
    let raw = dir.trim();
    if raw.is_empty() {
        return Ok(());
    }

    // Reset to root "/" so navigation is consistent regardless of initial landing directory
    let _ = ftp.cwd("/");

    let pwd = ftp.pwd().unwrap_or_else(|_| "/".to_string());
    let clean = raw.trim_matches('/');

    let target = if pwd.trim_end_matches('/') == "/public_html" || pwd == "public_html" {
        if clean == "public_html" {
            ""
        } else if let Some(rest) = clean.strip_prefix("public_html/") {
            rest
        } else {
            clean
        }
    } else {
        clean
    };

    if target.is_empty() {
        return Ok(());
    }

    for part in target.split('/').filter(|p| !p.is_empty()) {
        if ftp.cwd(part).is_err() {
            ftp.mkdir(part).map_err(|e| format!("sync_mkdir_failed: {}", e))?;
            ftp.cwd(part).map_err(|e| format!("sync_cwd_failed: {}", e))?;
        }
    }
    Ok(())
}

pub fn test_connection(cfg: &SyncConfig) -> Result<(), String> {
    let mut ftp = connect(cfg)?;
    enter_dir(&mut ftp, &cfg.remote_dir)?;
    let _ = ftp.quit();
    Ok(())
}

pub fn download(cfg: &SyncConfig) -> Result<Option<Vec<u8>>, String> {
    let mut ftp = connect(cfg)?;
    enter_dir(&mut ftp, &cfg.remote_dir)?;
    let file = remote_file(cfg);

    let names = ftp.nlst(None).unwrap_or_default();
    let exists = names
        .iter()
        .any(|name| name.rsplit('/').next().map(str::trim) == Some(file.as_str()));

    let bytes = if exists {
        let cursor = ftp
            .retr_as_buffer(&file)
            .map_err(|e| format!("sync_download_failed: {}", e))?;
        Some(cursor.into_inner())
    } else {
        None
    };
    let _ = ftp.quit();
    Ok(bytes)
}

pub fn upload(cfg: &SyncConfig, bytes: &[u8]) -> Result<(), String> {
    let mut ftp = connect(cfg)?;
    enter_dir(&mut ftp, &cfg.remote_dir)?;

    let mut guard = Cursor::new(HTACCESS.as_bytes());
    let _ = ftp.put_file(".htaccess", &mut guard);

    let mut reader = Cursor::new(bytes);
    ftp.put_file(remote_file(cfg), &mut reader)
        .map_err(|e| format!("sync_upload_failed: {}", e))?;
    let _ = ftp.quit();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn cfg_from_env() -> Option<SyncConfig> {
        Some(SyncConfig {
            enabled: true,
            auto_sync: false,
            protocol: "ftp".to_string(),
            host: std::env::var("FAMILYNOTES_FTP_HOST").ok()?,
            port: std::env::var("FAMILYNOTES_FTP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(21),
            username: std::env::var("FAMILYNOTES_FTP_USER").ok()?,
            password: std::env::var("FAMILYNOTES_FTP_PASS").ok()?,
            remote_dir: std::env::var("FAMILYNOTES_FTP_DIR")
                .unwrap_or_else(|_| "public_html/familyNotes".to_string()),
            remote_file: "family_notes_synctest.bin".to_string(),
        })
    }

    #[test]
    #[ignore = "requires live FTP credentials in FAMILYNOTES_FTP_* env vars"]
    fn ftp_round_trip() {
        let Some(cfg) = cfg_from_env() else {
            eprintln!("skipping ftp_round_trip: FAMILYNOTES_FTP_* not set");
            return;
        };
        test_connection(&cfg).expect("connection");
        let payload = b"familynotes-sync-roundtrip-check".to_vec();
        upload(&cfg, &payload).expect("upload");
        let fetched = download(&cfg).expect("download").expect("file should exist");
        assert_eq!(fetched, payload);
    }
}

