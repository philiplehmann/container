//! Running and finished conversions, for the `/processes` endpoints. unoserver tracks the child
//! processes it spawns; here a conversion runs on a thread of this process, so a "process" is a
//! conversion job with the same fields (its `pid` is the server's).

use std::collections::HashMap;
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::Duration;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use tokio::sync::Notify;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "lowercase")]
pub enum JobStatus {
  Running,
  Completed,
  Failed,
  Killed,
}

/// The signals `DELETE /processes/{id}` takes. A conversion can't be interrupted mid-way;
/// every signal stops waiting for it, answers its request with an error and marks it killed.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, ToSchema)]
pub enum Signal {
  #[default]
  #[serde(rename = "SIGTERM")]
  Term,
  #[serde(rename = "SIGKILL")]
  Kill,
  #[serde(rename = "SIGINT")]
  Int,
  #[serde(rename = "SIGHUP")]
  Hup,
}

/// A conversion, shaped like unoserver's tracked process.
#[derive(Debug, Clone, Serialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct JobInfo {
  #[schema(value_type = String, format = "uuid")]
  pub id: Uuid,
  /// The engine: wordcraft, deckcraft or gridcraft.
  pub command: String,
  /// The conversion options, as command line style arguments.
  pub args: Vec<String>,
  /// The server's process id (conversions run in process).
  pub pid: u32,
  pub status: JobStatus,
  pub start_time: DateTime<Utc>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub end_time: Option<DateTime<Utc>>,
  /// 0 when completed, 1 when failed.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub exit_code: Option<i32>,
  /// The signal a killed conversion was stopped with.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub signal: Option<Signal>,
}

#[derive(Debug, Default, Clone, Copy, Serialize, ToSchema)]
pub struct JobSummary {
  pub running: usize,
  pub completed: usize,
  pub failed: usize,
  pub killed: usize,
}

struct Job {
  info: JobInfo,
  cancel: Arc<Notify>,
}

#[derive(Clone, Copy, Debug)]
pub struct JobsConfig {
  /// How long finished jobs are kept.
  pub retention: Duration,
  /// How many finished jobs are kept at most (newest win).
  pub max_completed: usize,
}

impl Default for JobsConfig {
  fn default() -> Self {
    Self {
      retention: Duration::from_secs(3600),
      max_completed: 1000,
    }
  }
}

pub struct Jobs {
  jobs: Mutex<HashMap<Uuid, Job>>,
  config: JobsConfig,
}

/// A started job; `cancelled()` resolves when it is killed.
pub struct JobHandle {
  pub id: Uuid,
  cancel: Arc<Notify>,
}

impl JobHandle {
  pub async fn cancelled(&self) {
    self.cancel.notified().await;
  }
}

impl Jobs {
  pub fn new(config: JobsConfig) -> Self {
    Self {
      jobs: Mutex::new(HashMap::new()),
      config,
    }
  }

  fn lock(&self) -> MutexGuard<'_, HashMap<Uuid, Job>> {
    // A panic while holding the lock leaves plain data behind; keep serving it.
    self.jobs.lock().unwrap_or_else(|e| e.into_inner())
  }

  pub fn start(&self, command: &str, args: Vec<String>) -> JobHandle {
    let mut jobs = self.lock();
    self.cleanup(&mut jobs);
    let id = Uuid::new_v4();
    let cancel = Arc::new(Notify::new());
    let info = JobInfo {
      id,
      command: command.to_string(),
      args,
      pid: std::process::id(),
      status: JobStatus::Running,
      start_time: Utc::now(),
      end_time: None,
      exit_code: None,
      signal: None,
    };
    jobs.insert(
      id,
      Job {
        info,
        cancel: cancel.clone(),
      },
    );
    JobHandle { id, cancel }
  }

  /// Record how a job ended; a job already killed stays killed.
  pub fn finish(&self, id: Uuid, success: bool) {
    if let Some(job) = self.lock().get_mut(&id)
      && job.info.status == JobStatus::Running
    {
      job.info.status = if success {
        JobStatus::Completed
      } else {
        JobStatus::Failed
      };
      job.info.exit_code = Some(if success { 0 } else { 1 });
      job.info.end_time = Some(Utc::now());
    }
  }

  /// Kill a running job: it is marked killed and its request stops waiting for it.
  pub fn kill(&self, id: Uuid, signal: Signal) -> bool {
    let mut jobs = self.lock();
    let Some(job) = jobs.get_mut(&id).filter(|j| j.info.status == JobStatus::Running) else {
      return false;
    };
    job.info.status = JobStatus::Killed;
    job.info.signal = Some(signal);
    job.info.end_time = Some(Utc::now());
    // `notify_one` keeps a permit, so a kill before the request waits isn't lost.
    job.cancel.notify_one();
    true
  }

  pub fn get(&self, id: Uuid) -> Option<JobInfo> {
    self.lock().get(&id).map(|j| j.info.clone())
  }

  /// Jobs, oldest first, optionally only those with `status`.
  pub fn list(&self, status: Option<JobStatus>) -> Vec<JobInfo> {
    let mut list: Vec<JobInfo> = self
      .lock()
      .values()
      .filter(|j| status.is_none_or(|s| j.info.status == s))
      .map(|j| j.info.clone())
      .collect();
    list.sort_by_key(|j| j.start_time);
    list
  }

  pub fn summary(&self) -> JobSummary {
    let mut summary = JobSummary::default();
    for job in self.lock().values() {
      match job.info.status {
        JobStatus::Running => summary.running += 1,
        JobStatus::Completed => summary.completed += 1,
        JobStatus::Failed => summary.failed += 1,
        JobStatus::Killed => summary.killed += 1,
      }
    }
    summary
  }

  /// Remove finished jobs (that ended at least `older_than` ago); returns how many.
  pub fn clear(&self, older_than: Option<Duration>) -> usize {
    let now = Utc::now();
    let mut jobs = self.lock();
    let before = jobs.len();
    jobs.retain(|_, j| match j.info.end_time {
      None => true,
      Some(end) => older_than.is_some_and(|age| (now - end).to_std().unwrap_or_default() < age),
    });
    before - jobs.len()
  }

  fn cleanup(&self, jobs: &mut HashMap<Uuid, Job>) {
    let now = Utc::now();
    jobs.retain(|_, j| {
      j.info
        .end_time
        .is_none_or(|end| (now - end).to_std().unwrap_or_default() <= self.config.retention)
    });
    let mut finished: Vec<(DateTime<Utc>, Uuid)> = jobs
      .values()
      .filter_map(|j| j.info.end_time.map(|end| (end, j.info.id)))
      .collect();
    if finished.len() > self.config.max_completed {
      finished.sort();
      for (_, id) in &finished[..finished.len() - self.config.max_completed] {
        jobs.remove(id);
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn tracks_lifecycle() {
    let jobs = Jobs::new(JobsConfig::default());
    let a = jobs.start("wordcraft", vec![]);
    let b = jobs.start("wordcraft", vec![]);
    let c = jobs.start("wordcraft", vec![]);
    jobs.finish(a.id, true);
    jobs.finish(b.id, false);
    assert!(jobs.kill(c.id, Signal::Kill));
    assert!(!jobs.kill(c.id, Signal::Kill), "a job is killed once");
    jobs.finish(c.id, true);

    let s = jobs.summary();
    assert_eq!((s.running, s.completed, s.failed, s.killed), (0, 1, 1, 1));
    assert_eq!(jobs.get(c.id).unwrap().signal, Some(Signal::Kill));
    assert_eq!(jobs.list(Some(JobStatus::Failed)).len(), 1);
    assert_eq!(jobs.get(a.id).unwrap().exit_code, Some(0));
  }

  #[test]
  fn clear_keeps_running_jobs() {
    let jobs = Jobs::new(JobsConfig::default());
    let a = jobs.start("wordcraft", vec![]);
    jobs.start("wordcraft", vec![]);
    jobs.finish(a.id, true);
    assert_eq!(jobs.clear(Some(Duration::from_secs(60))), 0, "too recent");
    assert_eq!(jobs.clear(None), 1);
    assert_eq!(jobs.list(None).len(), 1);
  }

  #[test]
  fn keeps_at_most_max_completed() {
    let jobs = Jobs::new(JobsConfig {
      max_completed: 2,
      ..Default::default()
    });
    for _ in 0..4 {
      let j = jobs.start("wordcraft", vec![]);
      jobs.finish(j.id, true);
    }
    jobs.start("wordcraft", vec![]);
    assert_eq!(jobs.summary().completed, 2);
  }
}
