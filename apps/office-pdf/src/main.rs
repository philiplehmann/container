use office_pdf::{Config, app};
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> Result<(), String> {
  // `office-pdf healthcheck`: for the container HEALTHCHECK (the image has no curl).
  if std::env::args().nth(1).as_deref() == Some("healthcheck") {
    return healthcheck();
  }
  // `office-pdf openapi`: print the OpenAPI document (for client generators), without serving.
  if std::env::args().nth(1).as_deref() == Some("openapi") {
    println!("{}", office_pdf::openapi().to_pretty_json().map_err(|e| e.to_string())?);
    return Ok(());
  }

  tracing_subscriber::fmt()
    .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")))
    .init();

  let config = Config::from_env()?;
  let addr = config.addr()?;
  let listener = tokio::net::TcpListener::bind(addr)
    .await
    .map_err(|e| format!("bind {addr}: {e}"))?;
  tracing::info!(%addr, max_concurrent_conversions = config.max_concurrent_conversions, "office-pdf listening");

  // Load the font database before the first request needs it.
  tokio::task::spawn_blocking(|| {
    let started = std::time::Instant::now();
    let warmup = office_pdf::convert::ConvertRequest {
      format: Some("txt".into()),
      ..Default::default()
    };
    match office_pdf::convert::convert(b"warm-up", &warmup) {
      Ok(_) => tracing::info!(elapsed_ms = started.elapsed().as_millis() as u64, "engine warmed up"),
      Err(e) => tracing::warn!(error = %e, "engine warm-up failed"),
    }
  });

  axum::serve(listener, app(&config))
    .with_graceful_shutdown(shutdown())
    .await
    .map_err(|e| e.to_string())
}

async fn shutdown() {
  let ctrl_c = async {
    let _ = tokio::signal::ctrl_c().await;
  };
  #[cfg(unix)]
  let terminate = async {
    if let Ok(mut s) = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate()) {
      s.recv().await;
    }
  };
  #[cfg(not(unix))]
  let terminate = std::future::pending::<()>();
  tokio::select! {
      () = ctrl_c => {},
      () = terminate => {},
  }
  tracing::info!("shutting down");
}

/// GET /health/liveness on the local server; Ok when it answers 200.
fn healthcheck() -> Result<(), String> {
  use std::io::{Read, Write};
  let port = Config::from_env()?.port;
  let mut stream = std::net::TcpStream::connect(("127.0.0.1", port)).map_err(|e| e.to_string())?;
  stream
    .set_read_timeout(Some(std::time::Duration::from_secs(3)))
    .map_err(|e| e.to_string())?;
  stream
    .write_all(b"GET /health/liveness HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
    .map_err(|e| e.to_string())?;
  let mut head = [0u8; 12];
  stream.read_exact(&mut head).map_err(|e| e.to_string())?;
  if head.starts_with(b"HTTP/1.1 200") {
    Ok(())
  } else {
    Err(format!("unhealthy: {}", String::from_utf8_lossy(&head)))
  }
}
