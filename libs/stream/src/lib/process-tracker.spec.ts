import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { spawn } from 'node:child_process';
import { ProcessTracker } from './process-tracker';

describe('ProcessTracker', () => {
  let tracker: ProcessTracker;

  beforeEach(() => {
    tracker = new ProcessTracker({ retentionMs: 60000, maxCompleted: 10 });
  });

  afterEach(() => {
    // Kill any remaining processes
    tracker.killAll();
  });

  describe('register', () => {
    it('should register a process and return a UUID', () => {
      const child = spawn('echo', ['hello']);
      const id = tracker.register(child);

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      const process = tracker.get(id);
      expect(process).toBeDefined();
      expect(process?.command).toBe('echo');
      expect(process?.args).toEqual(['hello']);
      expect(process?.status).toBe('running');
      expect(process?.startTime).toBeInstanceOf(Date);
    });

    it('should extract command and args from child process', () => {
      const child = spawn('ls', ['-la', '/tmp']);
      const id = tracker.register(child);

      const process = tracker.get(id);
      expect(process?.command).toBe('ls');
      expect(process?.args).toEqual(['-la', '/tmp']);
    });
  });

  describe('complete', () => {
    it('should mark process as completed on successful exit', async () => {
      const child = spawn('echo', ['hello']);
      const id = tracker.register(child);

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });

      const process = tracker.get(id);
      expect(process?.status).toBe('completed');
      expect(process?.exitCode).toBe(0);
      expect(process?.endTime).toBeInstanceOf(Date);
    });

    it('should mark process as failed on non-zero exit', async () => {
      const child = spawn('sh', ['-c', 'exit 1']);
      const id = tracker.register(child);

      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });

      const process = tracker.get(id);
      expect(process?.status).toBe('failed');
      expect(process?.exitCode).toBe(1);
    });
  });

  describe('kill', () => {
    it('should kill a running process with SIGTERM by default', async () => {
      const child = spawn('sleep', ['10']);
      const id = tracker.register(child);

      const result = tracker.kill(id);
      expect(result).toBe(true);

      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });

      const process = tracker.get(id);
      expect(process?.status).toBe('killed');
    });

    it('should kill a running process with specified signal', async () => {
      const child = spawn('sleep', ['10']);
      const id = tracker.register(child);

      const result = tracker.kill(id, 'SIGKILL');
      expect(result).toBe(true);

      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });

      const process = tracker.get(id);
      expect(process?.status).toBe('killed');
      expect(process?.signal).toBe('SIGKILL');
    });

    it('should return false for non-existent process', () => {
      const result = tracker.kill('non-existent-id');
      expect(result).toBe(false);
    });

    it('should return false for already completed process', async () => {
      const child = spawn('echo', ['hello']);
      const id = tracker.register(child);

      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });

      const result = tracker.kill(id);
      expect(result).toBe(false);
    });
  });

  describe('killAll', () => {
    it('should kill all running processes', async () => {
      const child1 = spawn('sleep', ['10']);
      const child2 = spawn('sleep', ['10']);
      tracker.register(child1);
      tracker.register(child2);

      const killed = tracker.killAll();
      expect(killed).toBe(2);

      await Promise.all([
        new Promise<void>((resolve) => child1.on('exit', () => resolve())),
        new Promise<void>((resolve) => child2.on('exit', () => resolve())),
      ]);

      const summary = tracker.getSummary();
      expect(summary.running).toBe(0);
      expect(summary.killed).toBe(2);
    });
  });

  describe('list', () => {
    it('should list all processes', async () => {
      const child1 = spawn('echo', ['hello']);
      const child2 = spawn('sleep', ['10']);
      tracker.register(child1);
      tracker.register(child2);

      await new Promise<void>((resolve) => {
        child1.on('exit', () => resolve());
      });

      const all = tracker.list();
      expect(all.length).toBe(2);
    });

    it('should filter by status', async () => {
      const child1 = spawn('echo', ['hello']);
      const child2 = spawn('sleep', ['10']);
      tracker.register(child1);
      tracker.register(child2);

      await new Promise<void>((resolve) => {
        child1.on('exit', () => resolve());
      });

      const running = tracker.list({ status: 'running' });
      expect(running.length).toBe(1);
      expect(running[0].command).toBe('sleep');

      const completed = tracker.list({ status: 'completed' });
      expect(completed.length).toBe(1);
      expect(completed[0].command).toBe('echo');
    });
  });

  describe('clear', () => {
    it('should clear all non-running processes', async () => {
      const child1 = spawn('echo', ['hello']);
      const child2 = spawn('sleep', ['10']);
      tracker.register(child1);
      tracker.register(child2);

      await new Promise<void>((resolve) => {
        child1.on('exit', () => resolve());
      });

      const cleared = tracker.clear();
      expect(cleared).toBe(1);

      const all = tracker.list();
      expect(all.length).toBe(1);
      expect(all[0].status).toBe('running');
    });

    it('should not clear running processes', async () => {
      const child = spawn('sleep', ['10']);
      tracker.register(child);

      const cleared = tracker.clear();
      expect(cleared).toBe(0);

      const all = tracker.list();
      expect(all.length).toBe(1);
    });

    it('should clear processes older than specified time', async () => {
      const child1 = spawn('echo', ['first']);
      const id1 = tracker.register(child1);

      await new Promise<void>((resolve) => {
        child1.on('exit', () => resolve());
      });

      // Manually set endTime to be old
      const process1 = tracker.get(id1);
      if (process1?.endTime) {
        process1.endTime = new Date(Date.now() - 10000); // 10 seconds ago
      }

      const child2 = spawn('echo', ['second']);
      tracker.register(child2);

      await new Promise<void>((resolve) => {
        child2.on('exit', () => resolve());
      });

      // Clear processes older than 5 seconds
      const cleared = tracker.clear(5000);
      expect(cleared).toBe(1);

      const all = tracker.list();
      expect(all.length).toBe(1);
      expect(all[0].args).toEqual(['second']);
    });
  });

  describe('getSummary', () => {
    it('should return correct counts by status', async () => {
      const child1 = spawn('echo', ['hello']);
      const child2 = spawn('sh', ['-c', 'exit 1']);
      const child3 = spawn('sleep', ['10']);
      tracker.register(child1);
      tracker.register(child2);
      tracker.register(child3);

      await Promise.all([
        new Promise<void>((resolve) => child1.on('exit', () => resolve())),
        new Promise<void>((resolve) => child2.on('exit', () => resolve())),
      ]);

      tracker.kill(tracker.list({ status: 'running' })[0].id);

      await new Promise<void>((resolve) => {
        child3.on('exit', () => resolve());
      });

      const summary = tracker.getSummary();
      expect(summary.completed).toBe(1);
      expect(summary.failed).toBe(1);
      expect(summary.killed).toBe(1);
      expect(summary.running).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('should enforce maxCompleted limit', async () => {
      const smallTracker = new ProcessTracker({ retentionMs: 60000, maxCompleted: 2 });

      // Create and complete 3 processes
      for (let i = 0; i < 3; i++) {
        const child = spawn('echo', [`process-${i}`]);
        smallTracker.register(child);
        await new Promise<void>((resolve) => {
          child.on('exit', () => resolve());
        });
      }

      // Register a new one to trigger cleanup
      const child = spawn('echo', ['trigger']);
      smallTracker.register(child);
      await new Promise<void>((resolve) => {
        child.on('exit', () => resolve());
      });

      const all = smallTracker.list();
      // Should have at most maxCompleted + 1 (the trigger process)
      expect(all.length).toBeLessThanOrEqual(3);
    });

    it('should remove processes older than retentionMs', async () => {
      const shortRetentionTracker = new ProcessTracker({ retentionMs: 100, maxCompleted: 100 });

      const child1 = spawn('echo', ['old']);
      const id1 = shortRetentionTracker.register(child1);

      await new Promise<void>((resolve) => {
        child1.on('exit', () => resolve());
      });

      // Manually set endTime to be very old
      const process1 = shortRetentionTracker.get(id1);
      if (process1?.endTime) {
        process1.endTime = new Date(Date.now() - 1000); // 1 second ago (past 100ms retention)
      }

      // Wait a bit and register a new process to trigger cleanup
      await new Promise((resolve) => setTimeout(resolve, 150));

      const child2 = spawn('echo', ['new']);
      shortRetentionTracker.register(child2);

      await new Promise<void>((resolve) => {
        child2.on('exit', () => resolve());
      });

      // The old process should have been cleaned up
      const oldProcess = shortRetentionTracker.get(id1);
      expect(oldProcess).toBeUndefined();
    });
  });

  describe('environment configuration', () => {
    it('should use default values when env vars not set', () => {
      const defaultTracker = new ProcessTracker();
      // Can't easily test internal config, but we can verify it doesn't throw
      expect(defaultTracker).toBeDefined();
    });
  });
});
