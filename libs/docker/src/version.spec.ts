import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the mock function definitions so they are available to the vi.mock factory
const { mockGetRequirementsPath } = vi.hoisted(() => ({ mockGetRequirementsPath: vi.fn() }));
const { mockReadFile } = vi.hoisted(() => ({ mockReadFile: vi.fn() }));

// Mock getRequirementsPath from its own file BEFORE importing versionModule
vi.mock('./getRequirementsPath', () => ({
  getRequirementsPath: mockGetRequirementsPath,
}));

// Mock readFile from its own file BEFORE importing versionModule
vi.mock('./readFile', () => ({
  readFile: mockReadFile,
}));

// Import all functions as a namespace to ensure mocks are respected
import * as versionModule from './version';

describe('versionFromRequirements', () => {
  const mockDockerfilePath = '/path/to/Dockerfile';
  const mockRequirementsPath = '/path/to/requirements.txt';

  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks();

    // Configure the default mock for getRequirementsPath
    mockGetRequirementsPath.mockReturnValue(mockRequirementsPath);
    // Set a default return value for readFile to avoid ENOENT
    mockReadFile.mockReturnValue('');
    // readFile will be configured per test as needed
  });

  it('should return the version of a library from requirements.txt', () => {
    const mockRequirementsContent = 'lib1==1.2.3\nlib2==4.5.6\nmy-lib==0.1.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);

    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('0.1.0');
    expect(mockGetRequirementsPath).toHaveBeenCalledWith(mockDockerfilePath);
    expect(mockReadFile).toHaveBeenCalledWith(mockRequirementsPath);
  });

  it('should return the version when the library is the first in requirements.txt', () => {
    const mockRequirementsContent = 'my-lib==0.1.0\nlib1==1.2.3\nlib2==4.5.6';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('0.1.0');
  });

  it('should return the version when the library is the last in requirements.txt', () => {
    const mockRequirementsContent = 'lib1==1.2.3\nlib2==4.5.6\nmy-lib==0.1.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('0.1.0');
  });

  it('should throw an error if the library is not found in requirements.txt', () => {
    const mockRequirementsContent = 'lib1==1.2.3\nlib2==4.5.6';
    mockReadFile.mockReturnValue(mockRequirementsContent);

    expect(() => versionModule.versionFromRequirements(mockDockerfilePath, 'unknown-lib')).toThrow(
      `can not find unknown-lib in ${mockRequirementsPath}`,
    );
  });

  it('should throw an error if requirements.txt is empty', () => {
    const mockRequirementsContent = '';
    mockReadFile.mockReturnValue(mockRequirementsContent);

    expect(() => versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib')).toThrow(
      `can not find my-lib in ${mockRequirementsPath}`,
    );
  });

  it('should throw an error if requirements.txt does not contain versions (no ==)', () => {
    const mockRequirementsContent = 'lib1\nlib2';
    mockReadFile.mockReturnValue(mockRequirementsContent);

    expect(() => versionModule.versionFromRequirements(mockDockerfilePath, 'lib1')).toThrow(
      `can not find lib1 in ${mockRequirementsPath}`,
    );
  });

  it('should handle lines with extra spaces around == and library name/version', () => {
    const mockRequirementsContent = '  my-lib  ==  0.1.0  ';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('0.1.0');
  });

  it('should handle library names with hyphens and underscores', () => {
    const mockRequirementsContent = 'my-super_lib==1.0.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-super_lib');
    expect(version).toBe('1.0.0');
  });

  it('should be case-sensitive for library names', () => {
    const mockRequirementsContent = 'My-Lib==1.0.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    expect(() => versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib')).toThrow(
      `can not find my-lib in ${mockRequirementsPath}`,
    );
    // Test the positive case as well
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'My-Lib');
    expect(version).toBe('1.0.0');
  });

  it('should correctly parse versions with multiple dots', () => {
    const mockRequirementsContent = 'my-lib==1.2.3.4';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('1.2.3.4');
  });

  it('should correctly parse versions with alphanumeric characters (e.g., alpha, beta, rc)', () => {
    const mockRequirementsContent = 'my-lib==1.0.0-alpha1\nlib2==2.0b2\nlib3==3.0rc3';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    expect(versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib')).toBe('1.0.0-alpha1');
    expect(versionModule.versionFromRequirements(mockDockerfilePath, 'lib2')).toBe('2.0b2');
    expect(versionModule.versionFromRequirements(mockDockerfilePath, 'lib3')).toBe('3.0rc3');
  });

  it('should handle requirements.txt with comments (lines starting with #)', () => {
    const mockRequirementsContent =
      '# This is a comment\nmy-lib==0.5.0\n# another comment\nlib2==1.0.0 # inline comment';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('0.5.0');
    // Test that inline comments don't affect parsing if the lib is different
    const version2 = versionModule.versionFromRequirements(mockDockerfilePath, 'lib2');
    expect(version2).toBe('1.0.0');
  });

  it('should handle requirements.txt with blank lines', () => {
    const mockRequirementsContent = '\nmy-lib==0.5.0\n\nlib2==1.0.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib');
    expect(version).toBe('0.5.0');
  });

  it('should throw error if readFile throws an error', () => {
    mockReadFile.mockImplementation(() => {
      throw new Error('File system error');
    });
    expect(() => versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib')).toThrow('File system error');
  });

  it('should handle different dockerfile paths correctly', () => {
    const anotherDockerfilePath = '/another/path/Dockerfile';
    const anotherRequirementsPath = '/another/path/requirements.txt';

    // Configure getRequirementsPath for this specific path
    mockGetRequirementsPath.mockImplementation((dockerfilePathValue: string) => {
      if (dockerfilePathValue === anotherDockerfilePath) {
        return anotherRequirementsPath;
      }
      // Fallback for any other calls (e.g. if other tests call it unexpectedly)
      return mockRequirementsPath;
    });

    const mockRequirementsContent = 'my-lib==0.1.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);

    const version = versionModule.versionFromRequirements(anotherDockerfilePath, 'my-lib');
    expect(version).toBe('0.1.0');
    // Ensure getRequirementsPath was called with the new path
    expect(mockGetRequirementsPath).toHaveBeenCalledWith(anotherDockerfilePath);
    // Ensure readFile was called with the path returned by the mock for anotherDockerfilePath
    expect(mockReadFile).toHaveBeenCalledWith(anotherRequirementsPath);
  });

  it('should handle library names with dots if that is part of the name', () => {
    const mockRequirementsContent = 'my.lib.with.dots==1.0.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my.lib.with.dots');
    expect(version).toBe('1.0.0');
  });

  it('should correctly parse version if library name contains special regex characters', () => {
    const mockRequirementsContent = 'my-lib(v2)==1.0.0';
    mockReadFile.mockReturnValue(mockRequirementsContent);
    const version = versionModule.versionFromRequirements(mockDockerfilePath, 'my-lib(v2)');
    expect(version).toBe('1.0.0');
  });
});
