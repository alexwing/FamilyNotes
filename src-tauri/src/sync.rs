// Remote vault synchronisation over explicit FTPS (AUTH TLS).
//
// The server (vsftpd) refuses plain-FTP logins, so every session upgrades the
// control channel with AUTH TLS before USER/PASS, and protects the data channel
// too (PBSZ 0 / PROT P, done by suppaftp's `into_secure`) in passive mode.
//
// The certificate is validated against the public Mozilla roots and the
// configured host name (e.g. `cloud.mappuzzle.xyz`; an IP address will not
// match the certificate). There is deliberately no way to disable that check.
// The TLS stack is rustls with the `ring` provider (TLS 1.2+ only), so Android
// does not need OpenSSL.
use std::io::{Read, Write};
use std::net::{Shutdown, SocketAddr, TcpStream, ToSocketAddrs};
use std::sync::Arc;
use std::time::Duration;

use suppaftp::rustls::{self, ClientConfig, RootCertStore};
use suppaftp::types::FileType;
use suppaftp::{FtpError, FtpResult, RustlsConnector, RustlsFtpStream};

use crate::models::{migrate_protocol, SyncConfig, PROTOCOL_FTPS};

type FtpStream = RustlsFtpStream;

const HTACCESS: &str = "<IfModule mod_authz_core.c>
    Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
    Order allow,deny
    Deny from all
</IfModule>
Options -Indexes
";
const DEFAULT_FILE: &str = "family_notes.fnvault";

/// Connect and per-read/write limits, so a stuck exchange fails fast instead of
/// freezing sync until the server's idle timeout. With FTPS, suppaftp starts
/// the data-channel TLS handshake before reading the command reply, so a data
/// command the server rejects would otherwise hang.
const CONNECT_TIMEOUT: Duration = Duration::from_secs(15);
const IO_TIMEOUT: Duration = Duration::from_secs(30);

fn remote_file(cfg: &SyncConfig) -> String {
    let file = cfg.remote_file.trim();
    if file.is_empty() {
        DEFAULT_FILE.to_string()
    } else {
        file.to_string()
    }
}

/// TLS 1.2 and 1.3 only (rustls' safe defaults), Mozilla roots, host-name
/// verification always on.
fn tls_connector() -> Result<RustlsConnector, String> {
    let roots = RootCertStore::from_iter(webpki_roots::TLS_SERVER_ROOTS.iter().cloned());
    // Explicit provider: never depends on a process-wide default being installed.
    let provider = Arc::new(rustls::crypto::ring::default_provider());
    let config = ClientConfig::builder_with_provider(provider)
        .with_safe_default_protocol_versions()
        .map_err(|e| format!("sync_tls_failed: {}", e))?
        .with_root_certificates(roots)
        .with_no_client_auth();
    Ok(RustlsConnector::from(Arc::new(config)))
}

fn tcp_with_timeouts(addr: SocketAddr) -> std::io::Result<TcpStream> {
    let stream = TcpStream::connect_timeout(&addr, CONNECT_TIMEOUT)?;
    stream.set_read_timeout(Some(IO_TIMEOUT))?;
    stream.set_write_timeout(Some(IO_TIMEOUT))?;
    Ok(stream)
}

/// Control connection, trying every resolved address in order: a host may
/// publish IPv6 while the FTP daemon only listens on IPv4.
fn control_stream(host: &str, port: u16) -> Result<TcpStream, String> {
    let addrs = (host, port)
        .to_socket_addrs()
        .map_err(|e| format!("sync_connect_failed: {}", e))?;
    let mut last_err = None;
    for addr in addrs {
        match tcp_with_timeouts(addr) {
            Ok(stream) => return Ok(stream),
            Err(e) => last_err = Some(e),
        }
    }
    Err(match last_err {
        Some(e) => format!("sync_connect_failed: {}", e),
        None => "sync_connect_failed: no address".to_string(),
    })
}

/// Passive data connections get the same timeouts as the control channel.
fn data_stream(addr: SocketAddr) -> FtpResult<TcpStream> {
    tcp_with_timeouts(addr).map_err(FtpError::ConnectionError)
}

fn connect(cfg: &SyncConfig) -> Result<FtpStream, String> {
    let host = cfg.host.trim();
    if host.is_empty() {
        return Err("sync_host_required".to_string());
    }
    if migrate_protocol(&cfg.protocol) != PROTOCOL_FTPS {
        return Err("sync_protocol_invalid".to_string());
    }
    let stream = control_stream(host, cfg.port)?;
    let ftp = FtpStream::connect_with_stream(stream)
        .map_err(|e| format!("sync_connect_failed: {}", e))?
        .passive_stream_builder(data_stream);
    // AUTH TLS + handshake (certificate and host name checked here), then
    // PBSZ 0 / PROT P so listings and transfers are encrypted as well.
    let mut ftp = ftp
        .into_secure(tls_connector()?, host)
        .map_err(|e| format!("sync_tls_failed: {}", e))?;
    ftp.login(cfg.username.trim(), &cfg.password)
        .map_err(|e| format!("sync_auth_failed: {}", e))?;
    // The vault is binary; never let the server apply ASCII conversions.
    ftp.transfer_type(FileType::Binary)
        .map_err(|e| format!("sync_connect_failed: {}", e))?;
    Ok(ftp)
}

fn enter_dir(ftp: &mut FtpStream, dir: &str) -> Result<(), String> {
    enter_dir_with(ftp, dir, true)
}

/// Same as `enter_dir`; with `create == false` a missing segment is an error
/// instead of being created (read-only probing).
fn enter_dir_with(ftp: &mut FtpStream, dir: &str, create: bool) -> Result<(), String> {
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
            if !create {
                return Err(format!("sync_cwd_failed: {}", part));
            }
            ftp.mkdir(part).map_err(|e| format!("sync_mkdir_failed: {}", e))?;
            ftp.cwd(part).map_err(|e| format!("sync_cwd_failed: {}", e))?;
        }
    }
    Ok(())
}

pub fn test_connection(cfg: &SyncConfig) -> Result<(), String> {
    let mut ftp = connect(cfg)?;
    enter_dir(&mut ftp, &cfg.remote_dir)?;
    // Exercise the (TLS) data channel too: a listing needs a passive
    // connection, exactly like downloads and uploads do.
    list_names(&mut ftp)?;
    let _ = ftp.quit();
    Ok(())
}

/// Bare file names in the current directory (data channel + PROT P).
fn list_names(ftp: &mut FtpStream) -> Result<Vec<String>, String> {
    let names = ftp
        .nlst(None)
        .map_err(|e| format!("sync_list_failed: {}", e))?;
    Ok(names
        .iter()
        .filter_map(|n| n.rsplit('/').next().map(|s| s.trim().to_string()))
        .collect())
}

pub fn download(cfg: &SyncConfig) -> Result<Option<Vec<u8>>, String> {
    let mut ftp = connect(cfg)?;
    enter_dir(&mut ftp, &cfg.remote_dir)?;
    let file = remote_file(cfg);

    let exists = list_names(&mut ftp)?.iter().any(|name| name == &file);

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

/// STOR `bytes` as `name` and make sure every byte reached the server.
///
/// suppaftp's `put_file` drops the TLS data stream right away: it writes the
/// close_notify once and closes the socket without reading what the server
/// sent on it (TLS 1.3 session tickets). Closing a socket with unread data
/// makes Windows/Android send an RST, and vsFTPd then discards whatever it
/// had not read yet, so vaults ended up truncated at 8 KiB boundaries while
/// the server still answered 226.
///
/// Here the payload is written and flushed with error checks, and a duplicate
/// handle keeps the TCP connection alive while suppaftp's TLS wrapper is
/// dropped (that is what sends close_notify). Then we half-close (FIN), drain
/// the socket until the server closes its side, and only then read the 226.
fn put_bytes(ftp: &mut FtpStream, name: &str, bytes: &[u8]) -> Result<(), String> {
    let mut stream = ftp
        .put_with_stream(name)
        .map_err(|e| format!("sync_upload_failed: {}", e))?;
    let raw = stream
        .get_ref()
        .try_clone()
        .map_err(|e| format!("sync_upload_failed: {}", e))?;

    stream
        .write_all(bytes)
        .and_then(|_| stream.flush())
        .map_err(|e| format!("sync_upload_failed: {}", e))?;

    // TLS close_notify is sent here; `raw` keeps the connection open.
    drop(stream);
    let _ = raw.shutdown(Shutdown::Write);
    let mut sink = [0u8; 4096];
    let mut raw_reader = &raw;
    while let Ok(n) = raw_reader.read(&mut sink) {
        if n == 0 {
            break;
        }
    }
    drop(raw);

    ftp.finalize_put_stream(std::io::sink())
        .map_err(|e| format!("sync_upload_failed: {}", e))
}

pub fn upload(cfg: &SyncConfig, bytes: &[u8]) -> Result<(), String> {
    let mut ftp = connect(cfg)?;
    enter_dir(&mut ftp, &cfg.remote_dir)?;

    // Only add the deny-all guard where there is no .htaccess yet: never
    // overwrite one that already exists (e.g. a site's, if the vault lives
    // in a web root).
    if !list_names(&mut ftp)?.iter().any(|n| n == ".htaccess") {
        let _ = put_bytes(&mut ftp, ".htaccess", HTACCESS.as_bytes());
    }

    let file = remote_file(cfg);
    put_bytes(&mut ftp, &file, bytes)?;

    // Never report success for a partial upload: compare the size the
    // server stored with what we sent (transfer type is binary).
    let stored = ftp
        .size(&file)
        .map_err(|e| format!("sync_upload_verify_failed: {}", e))?;
    if stored != bytes.len() {
        return Err(format!(
            "sync_upload_incomplete: {} of {} bytes stored",
            stored,
            bytes.len()
        ));
    }
    let _ = ftp.quit();
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn protocol_migrates_legacy_values_to_ftps() {
        for legacy in ["", "ftp", "FTP", " ftp ", "ftps", "FTPS"] {
            assert_eq!(migrate_protocol(legacy), PROTOCOL_FTPS, "value {legacy:?}");
        }
        assert_eq!(migrate_protocol("sftp"), "sftp");
    }

    #[test]
    fn sync_config_deserialization_migrates_protocol() {
        let legacy = r#"{"enabled":true,"protocol":"ftp","host":"h","port":21,"username":"u",
            "password":"p","remoteDir":"d","remoteFile":"f","autoSync":true}"#;
        let cfg: SyncConfig = serde_json::from_str(legacy).unwrap();
        assert_eq!(cfg.protocol, PROTOCOL_FTPS);

        let missing = r#"{"enabled":true,"host":"h","port":21,"username":"u",
            "password":"p","remoteDir":"d","remoteFile":"f","autoSync":true}"#;
        let cfg: SyncConfig = serde_json::from_str(missing).unwrap();
        assert_eq!(cfg.protocol, PROTOCOL_FTPS);

        assert_eq!(SyncConfig::default().protocol, PROTOCOL_FTPS);
        let reserialized = serde_json::to_string(&cfg).unwrap();
        assert!(reserialized.contains(r#""protocol":"ftps""#));
    }

    #[test]
    fn unknown_protocol_is_rejected_before_connecting() {
        let cfg = SyncConfig {
            host: "example.invalid".to_string(),
            protocol: "sftp".to_string(),
            ..SyncConfig::default()
        };
        assert_eq!(connect(&cfg).err().as_deref(), Some("sync_protocol_invalid"));
    }

    #[test]
    fn tls_connector_builds() {
        assert!(tls_connector().is_ok());
    }

    /// Live config from env vars only (never from files). The host must be the
    /// certificate's name (cloud.mappuzzle.xyz), not an IP.
    fn cfg_from_env() -> Option<SyncConfig> {
        Some(SyncConfig {
            enabled: true,
            auto_sync: false,
            protocol: PROTOCOL_FTPS.to_string(),
            host: std::env::var("FAMILYNOTES_FTP_HOST").ok()?,
            port: std::env::var("FAMILYNOTES_FTP_PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(21),
            username: std::env::var("FAMILYNOTES_FTP_USER").ok()?,
            password: std::env::var("FAMILYNOTES_FTP_PASS").ok()?,
            remote_dir: std::env::var("FAMILYNOTES_FTP_DIR").unwrap_or_default(),
            remote_file: "family_notes_synctest.bin".to_string(),
        })
    }

    /// Read-only: logs in over FTPS and lists the configured directory
    /// (without creating it). Writes nothing.
    #[test]
    #[ignore = "requires live FTPS credentials in FAMILYNOTES_FTP_* env vars"]
    fn ftps_list_remote_dir() {
        let cfg = cfg_from_env().expect("FAMILYNOTES_FTP_HOST/USER/PASS must be set");
        let mut ftp = connect(&cfg).expect("FTPS connect + login");
        enter_dir_with(&mut ftp, &cfg.remote_dir, false).expect("cwd");
        let pwd = ftp.pwd().expect("pwd");
        let names = ftp.nlst(None).expect("NLST over protected data channel");
        eprintln!("FTPS OK, {} entries in {}:", names.len(), pwd);
        for name in &names {
            eprintln!("  {name}");
        }
        let _ = ftp.quit();
    }

    /// Full upload/download through the public API, confined to a fresh
    /// temporary subdirectory that is removed afterwards (file, its .htaccess
    /// guard, then the directory). Never touches real vaults or .htaccess.
    #[test]
    #[ignore = "requires live FTPS credentials in FAMILYNOTES_FTP_* env vars"]
    fn ftps_round_trip_in_temp_dir() {
        let base = cfg_from_env().expect("FAMILYNOTES_FTP_HOST/USER/PASS must be set");
        let temp_name = format!("fn-synctest-{}", uuid::Uuid::new_v4().simple());
        let base_dir = base.remote_dir.trim().trim_matches('/').to_string();
        let mut cfg = base.clone();
        cfg.remote_dir = if base_dir.is_empty() {
            temp_name.clone()
        } else {
            format!("{base_dir}/{temp_name}")
        };

        // The temp dir must not exist yet: we only ever delete what we created.
        {
            let mut ftp = connect(&cfg).expect("connect");
            enter_dir_with(&mut ftp, &base.remote_dir, false).expect("cwd base");
            assert!(ftp.cwd(&temp_name).is_err(), "temp dir unexpectedly exists");
            let _ = ftp.quit();
        }

        test_connection(&cfg).expect("connection");
        assert_eq!(download(&cfg).expect("download (empty)"), None);
        // Large and not a multiple of 8 KiB: uploads used to lose their last
        // 8 KiB blocks when the TLS data connection was torn down.
        let payload: Vec<u8> = (0..200_003u32).map(|i| (i.wrapping_mul(31) % 251) as u8).collect();
        let result = upload(&cfg, &payload).and_then(|_| download(&cfg));

        // Cleanup always runs, before asserting.
        let mut ftp = connect(&cfg).expect("connect for cleanup");
        enter_dir_with(&mut ftp, &base.remote_dir, false).expect("cwd base");
        ftp.cwd(&temp_name).expect("cwd temp");
        let rm_file = ftp.rm(&remote_file(&cfg));
        let rm_guard = ftp.rm(".htaccess");
        ftp.cdup().expect("cdup");
        let rm_dir = ftp.rmdir(&temp_name);
        let _ = ftp.quit();

        assert_eq!(result.expect("upload + download"), Some(payload));
        rm_file.expect("remove temp file");
        rm_guard.expect("remove temp .htaccess");
        rm_dir.expect("remove temp dir");
    }
}
