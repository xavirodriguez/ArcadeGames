import { spawn, ChildProcess } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';

export function detectSystemPlayerPlatform(platform = os.platform()): { command: string; args: (file: string) => string[] } | null {
  if (platform === 'darwin') {
    return { command: 'afplay', args: (file) => [file] };
  }
  if (platform === 'linux') {
    return { command: 'paplay', args: (file) => [file] };
  }
  if (platform === 'win32') {
    return {
      command: 'powershell',
      args: (file) => ['-c', `(New-Object System.Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`],
    };
  }
  return null;
}

export function playWavFile(file: string, platform = os.platform()): ChildProcess | null {
  const launcher = detectSystemPlayerPlatform(platform);
  if (!launcher) {
    console.log(`System audio player not supported on ${platform}. WAV generated at: ${file}`);
    return null;
  }

  try {
    const child = spawn(launcher.command, launcher.args(file), { stdio: 'ignore' });
    child.on('error', () => {
      console.log(`Failed to launch system player "${launcher.command}". Temp WAV saved at: ${file}`);
    });
    return child;
  } catch {
    console.log(`Temp WAV saved at: ${file}`);
    return null;
  }
}

const tempFilesCreated = new Set<string>();

export function registerTempWav(file: string): void {
  tempFilesCreated.add(file);
}

export function cleanupTempWavs(): void {
  for (const file of tempFilesCreated) {
    try {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    } catch {
      // Safe catch
    }
  }
  tempFilesCreated.clear();
}

process.on('exit', cleanupTempWavs);
process.on('SIGINT', () => {
  cleanupTempWavs();
  process.exit(0);
});
