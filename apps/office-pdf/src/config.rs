use std::net::SocketAddr;
use std::path::PathBuf;

/// Server settings, read from the environment.
#[derive(Clone, Debug)]
pub struct Config {
  pub host: String,
  pub port: u16,
  /// Largest accepted request body in bytes (`MAX_BODY_BYTES`, default 100 MiB).
  pub max_body_bytes: usize,
  /// Conversions running at the same time (`MAX_CONCURRENT_CONVERSIONS`, default: CPU count).
  /// Further requests wait for a free slot instead of piling up memory.
  pub max_concurrent_conversions: usize,
  /// Root that `/v1/direct-fs` reads input paths from (`FS_INPUT_ROOT`, default `/data/in`).
  pub fs_input_root: PathBuf,
  /// Root that `/v1/direct-fs` writes output paths to (`FS_OUTPUT_ROOT`, default `/data/out`).
  pub fs_output_root: PathBuf,
  /// How long finished conversions stay in `/v1/processes` (`PROCESS_RETENTION_MS`, 1 hour).
  pub process_retention_ms: u64,
  /// How many finished conversions `/v1/processes` keeps (`PROCESS_MAX_COMPLETED`, 1000).
  pub process_max_completed: usize,
}

impl Default for Config {
  fn default() -> Self {
    Self {
      host: "0.0.0.0".into(),
      port: 3000,
      max_body_bytes: 100 * 1024 * 1024,
      max_concurrent_conversions: std::thread::available_parallelism().map_or(1, usize::from),
      fs_input_root: "/data/in".into(),
      fs_output_root: "/data/out".into(),
      process_retention_ms: 3_600_000,
      process_max_completed: 1000,
    }
  }
}

impl Config {
  pub fn from_env() -> Result<Self, String> {
    Self::from_lookup(|name| std::env::var(name).ok())
  }

  pub fn from_lookup(get: impl Fn(&str) -> Option<String>) -> Result<Self, String> {
    let defaults = Self::default();
    Ok(Self {
      host: get("HOST").unwrap_or(defaults.host),
      port: parse(&get, "PORT", defaults.port)?,
      max_body_bytes: parse(&get, "MAX_BODY_BYTES", defaults.max_body_bytes)?,
      max_concurrent_conversions: parse(&get, "MAX_CONCURRENT_CONVERSIONS", defaults.max_concurrent_conversions)?
        .max(1),
      fs_input_root: get("FS_INPUT_ROOT").map_or(defaults.fs_input_root, PathBuf::from),
      fs_output_root: get("FS_OUTPUT_ROOT").map_or(defaults.fs_output_root, PathBuf::from),
      process_retention_ms: parse(&get, "PROCESS_RETENTION_MS", defaults.process_retention_ms)?,
      process_max_completed: parse(&get, "PROCESS_MAX_COMPLETED", defaults.process_max_completed)?,
    })
  }

  pub fn addr(&self) -> Result<SocketAddr, String> {
    format!("{}:{}", self.host, self.port)
      .parse()
      .map_err(|e| format!("invalid HOST/PORT {}:{}: {e}", self.host, self.port))
  }
}

fn parse<T: std::str::FromStr>(get: &impl Fn(&str) -> Option<String>, name: &str, default: T) -> Result<T, String>
where
  T::Err: std::fmt::Display,
{
  match get(name) {
    None => Ok(default),
    Some(v) if v.trim().is_empty() => Ok(default),
    Some(v) => v.trim().parse().map_err(|e| format!("invalid {name}={v}: {e}")),
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::collections::HashMap;

  fn lookup(vars: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
    let map: HashMap<String, String> = vars.iter().map(|(k, v)| (k.to_string(), v.to_string())).collect();
    move |name| map.get(name).cloned()
  }

  #[test]
  fn defaults_without_env() {
    let c = Config::from_lookup(lookup(&[])).unwrap();
    assert_eq!(c.port, 3000);
    assert_eq!(c.host, "0.0.0.0");
    assert!(c.max_concurrent_conversions >= 1);
  }

  #[test]
  fn reads_env() {
    let c = Config::from_lookup(lookup(&[
      ("HOST", "127.0.0.1"),
      ("PORT", "5000"),
      ("MAX_BODY_BYTES", "1024"),
      ("MAX_CONCURRENT_CONVERSIONS", "0"),
    ]))
    .unwrap();
    assert_eq!(c.addr().unwrap().to_string(), "127.0.0.1:5000");
    assert_eq!(c.max_body_bytes, 1024);
    assert_eq!(c.max_concurrent_conversions, 1);
  }

  #[test]
  fn rejects_invalid_port() {
    assert!(Config::from_lookup(lookup(&[("PORT", "abc")])).is_err());
  }
}
