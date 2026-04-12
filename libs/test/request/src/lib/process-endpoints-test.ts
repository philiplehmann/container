import { expect, it } from 'bun:test';
import { testRequest } from './test-request';

interface ProcessInfo {
  id: string;
  command: string;
  args: string[];
  pid: number;
  status: 'running' | 'completed' | 'failed' | 'killed';
  startTime: string;
  endTime?: string;
  exitCode?: number;
  signal?: string;
}

interface ProcessSummary {
  running: number;
  completed: number;
  failed: number;
  killed: number;
}

interface ProcessListResponse {
  processes: ProcessInfo[];
  summary: ProcessSummary;
}

interface ClearProcessesResponse {
  cleared: number;
}

// Valid UUID that doesn't exist
const NON_EXISTENT_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Creates a test suite for process management endpoints.
 * Call this inside a describe() block after the container is set up.
 *
 * @param getPort - Function that returns the current test container port
 * @param triggerProcess - Function that triggers a process (e.g., make an API call that spawns a child process)
 */
export const createProcessEndpointTests = (
  getPort: () => number,
  triggerProcess: (port: number) => Promise<void>,
): void => {
  it('should list processes (empty initially or with existing)', async () => {
    const [response, text] = await testRequest({
      method: 'GET',
      host: 'localhost',
      port: getPort(),
      path: '/processes',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(text) as ProcessListResponse;
    expect(json).toHaveProperty('processes');
    expect(json).toHaveProperty('summary');
    expect(Array.isArray(json.processes)).toBe(true);
    expect(typeof json.summary.running).toBe('number');
    expect(typeof json.summary.completed).toBe('number');
    expect(typeof json.summary.failed).toBe('number');
    expect(typeof json.summary.killed).toBe('number');
  });

  it('should show process after triggering an operation', async () => {
    // Trigger a process
    await triggerProcess(getPort());

    // List processes
    const [response, text] = await testRequest({
      method: 'GET',
      host: 'localhost',
      port: getPort(),
      path: '/processes',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(text) as ProcessListResponse;
    expect(json.processes.length).toBeGreaterThan(0);

    const process = json.processes[0];
    expect(process).toHaveProperty('id');
    expect(process).toHaveProperty('command');
    expect(process).toHaveProperty('args');
    expect(process).toHaveProperty('pid');
    expect(process).toHaveProperty('status');
    expect(process).toHaveProperty('startTime');
  });

  it('should filter processes by status', async () => {
    // Trigger a process to ensure we have at least one completed
    await triggerProcess(getPort());

    const [response, text] = await testRequest({
      method: 'GET',
      host: 'localhost',
      port: getPort(),
      path: '/processes?status=completed',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(text) as ProcessListResponse;
    expect(Array.isArray(json.processes)).toBe(true);
    // All returned processes should have status 'completed'
    for (const process of json.processes) {
      expect(process.status).toBe('completed');
    }
  });

  it('should get process by id', async () => {
    // Trigger a process
    await triggerProcess(getPort());

    // List processes to get an ID
    const [listResponse, listText] = await testRequest({
      method: 'GET',
      host: 'localhost',
      port: getPort(),
      path: '/processes',
    });

    expect(listResponse.statusCode).toBe(200);
    const listJson = JSON.parse(listText) as ProcessListResponse;
    expect(listJson.processes.length).toBeGreaterThan(0);

    const firstProcess = listJson.processes[0];
    if (!firstProcess) {
      throw new Error('Expected at least one process');
    }
    const processId = firstProcess.id;

    // Get specific process
    const [response, text] = await testRequest({
      method: 'GET',
      host: 'localhost',
      port: getPort(),
      path: `/processes/${processId}`,
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(text) as ProcessInfo;
    expect(json.id).toBe(processId);
  });

  it('should return 404 for non-existent process id', async () => {
    const [response] = await testRequest({
      method: 'GET',
      host: 'localhost',
      port: getPort(),
      path: `/processes/${NON_EXISTENT_UUID}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it('should clear completed processes', async () => {
    // Trigger a process to have something to clear
    await triggerProcess(getPort());

    // Clear completed processes
    const [response, text] = await testRequest({
      method: 'DELETE',
      host: 'localhost',
      port: getPort(),
      path: '/processes',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(text) as ClearProcessesResponse;
    expect(json).toHaveProperty('cleared');
    expect(typeof json.cleared).toBe('number');
  });

  it('should clear processes older than specified time', async () => {
    const [response, text] = await testRequest({
      method: 'DELETE',
      host: 'localhost',
      port: getPort(),
      path: '/processes?olderThan=0',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(text) as ClearProcessesResponse;
    expect(json).toHaveProperty('cleared');
  });

  it('should return 404 when killing non-existent process', async () => {
    const [response] = await testRequest({
      method: 'DELETE',
      host: 'localhost',
      port: getPort(),
      path: `/processes/${NON_EXISTENT_UUID}`,
    });

    expect(response.statusCode).toBe(404);
  });
};
