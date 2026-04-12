import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export type ProcessStatus = 'running' | 'completed' | 'killed' | 'failed';

export interface TrackedProcess {
  id: string;
  pid: number;
  command: string;
  args: string[];
  startTime: Date;
  endTime?: Date;
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  status: ProcessStatus;
}

export interface ProcessTrackerConfig {
  /** How long to keep completed processes in milliseconds. Default: env PROCESS_RETENTION_MS or 3600000 (1 hour) */
  retentionMs?: number;
  /** Maximum number of completed processes to retain. Default: env PROCESS_MAX_COMPLETED or 1000 */
  maxCompleted?: number;
}

export interface ProcessSummary {
  running: number;
  completed: number;
  failed: number;
  killed: number;
}

const DEFAULT_RETENTION_MS = 3600000; // 1 hour
const DEFAULT_MAX_COMPLETED = 1000;

export class ProcessTracker {
  private processes: Map<string, TrackedProcess> = new Map();
  private childRefs: Map<string, ChildProcessWithoutNullStreams> = new Map();
  private config: Required<ProcessTrackerConfig>;

  constructor(config?: ProcessTrackerConfig) {
    this.config = {
      retentionMs:
        config?.retentionMs ??
        (process.env.PROCESS_RETENTION_MS
          ? Number.parseInt(process.env.PROCESS_RETENTION_MS, 10)
          : DEFAULT_RETENTION_MS),
      maxCompleted:
        config?.maxCompleted ??
        (process.env.PROCESS_MAX_COMPLETED
          ? Number.parseInt(process.env.PROCESS_MAX_COMPLETED, 10)
          : DEFAULT_MAX_COMPLETED),
    };
  }

  /**
   * Register a child process for tracking.
   * Extracts command and args from the child process automatically.
   * @returns The UUID assigned to this process
   */
  register(child: ChildProcessWithoutNullStreams): string {
    // Cleanup old processes before registering new ones
    this.cleanup();

    const id = randomUUID();
    const command = child.spawnfile;
    const args = child.spawnargs.slice(1); // First element is the command itself

    const tracked: TrackedProcess = {
      id,
      pid: child.pid ?? -1,
      command,
      args,
      startTime: new Date(),
      status: 'running',
    };

    this.processes.set(id, tracked);
    this.childRefs.set(id, child);

    // Auto-complete tracking when process exits
    child.on('exit', (exitCode, signal) => {
      this.complete(id, exitCode, signal);
    });

    return id;
  }

  /**
   * Mark a process as completed.
   * Called automatically when the child process exits.
   */
  complete(id: string, exitCode: number | null, signal: NodeJS.Signals | null): void {
    const process = this.processes.get(id);
    if (!process) {
      return;
    }

    process.endTime = new Date();
    process.exitCode = exitCode;
    process.signal = signal;

    // Determine status based on how the process ended
    if (process.status === 'killed') {
      // Already marked as killed by kill() method
    } else if (signal) {
      process.status = 'killed';
    } else if (exitCode === 0) {
      process.status = 'completed';
    } else {
      process.status = 'failed';
    }

    // Remove child reference since process is no longer running
    this.childRefs.delete(id);
  }

  /**
   * Kill a running process.
   * @param id The process UUID
   * @param signal The signal to send (default: SIGTERM)
   * @returns true if the process was found and kill signal was sent
   */
  kill(id: string, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const child = this.childRefs.get(id);
    const process = this.processes.get(id);

    if (!child || !process || process.status !== 'running') {
      return false;
    }

    // Mark as killed before sending signal
    process.status = 'killed';

    return child.kill(signal);
  }

  /**
   * Kill all running processes.
   * @param signal The signal to send (default: SIGTERM)
   * @returns The number of processes killed
   */
  killAll(signal: NodeJS.Signals = 'SIGTERM'): number {
    let killed = 0;

    for (const [id, process] of this.processes.entries()) {
      if (process.status === 'running') {
        if (this.kill(id, signal)) {
          killed++;
        }
      }
    }

    return killed;
  }

  /**
   * Get a single process by ID.
   */
  get(id: string): TrackedProcess | undefined {
    return this.processes.get(id);
  }

  /**
   * List all tracked processes, optionally filtered by status.
   */
  list(filter?: { status?: ProcessStatus }): TrackedProcess[] {
    const processes = Array.from(this.processes.values());

    if (filter?.status) {
      return processes.filter((p) => p.status === filter.status);
    }

    return processes;
  }

  /**
   * Clear completed/failed/killed processes.
   * @param olderThanMs Only clear processes older than this many milliseconds (optional)
   * @returns The number of processes cleared
   */
  clear(olderThanMs?: number): number {
    let cleared = 0;
    const now = Date.now();

    for (const [id, process] of this.processes.entries()) {
      // Don't clear running processes
      if (process.status === 'running') {
        continue;
      }

      // If olderThanMs specified, only clear processes older than that
      if (olderThanMs !== undefined && process.endTime) {
        const age = now - process.endTime.getTime();
        if (age < olderThanMs) {
          continue;
        }
      }

      this.processes.delete(id);
      this.childRefs.delete(id);
      cleared++;
    }

    return cleared;
  }

  /**
   * Get a summary of process counts by status.
   */
  getSummary(): ProcessSummary {
    const summary: ProcessSummary = {
      running: 0,
      completed: 0,
      failed: 0,
      killed: 0,
    };

    for (const process of this.processes.values()) {
      summary[process.status]++;
    }

    return summary;
  }

  /**
   * Internal cleanup to enforce retention policy.
   * Removes processes based on retentionMs and maxCompleted config.
   */
  private cleanup(): void {
    const now = Date.now();
    const completedProcesses: Array<{ id: string; endTime: Date }> = [];

    // First pass: remove processes older than retentionMs and collect completed processes
    for (const [id, process] of this.processes.entries()) {
      if (process.status === 'running') {
        continue;
      }

      if (process.endTime) {
        const age = now - process.endTime.getTime();
        if (age > this.config.retentionMs) {
          this.processes.delete(id);
          this.childRefs.delete(id);
          continue;
        }
        completedProcesses.push({ id, endTime: process.endTime });
      }
    }

    // Second pass: enforce maxCompleted limit (keep newest)
    if (completedProcesses.length > this.config.maxCompleted) {
      // Sort by endTime ascending (oldest first)
      completedProcesses.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

      // Remove oldest until we're at the limit
      const toRemove = completedProcesses.length - this.config.maxCompleted;
      for (let i = 0; i < toRemove; i++) {
        const item = completedProcesses[i];
        if (item) {
          this.processes.delete(item.id);
          this.childRefs.delete(item.id);
        }
      }
    }
  }
}

/** Default singleton process tracker with environment-based configuration */
export const processTracker = new ProcessTracker();
