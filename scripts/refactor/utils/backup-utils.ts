/**
 * Backup Utilities
 * 
 * Provides backup and restore functionality for refactoring operations
 */

import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface BackupInfo {
  id: string;
  timestamp: Date;
  files: string[];
  description: string;
  gitCommit?: string;
}

export class BackupManager {
  private backupDir: string;
  private backupIndex: Map<string, BackupInfo>;

  constructor(workspaceRoot: string = process.cwd()) {
    this.backupDir = path.join(workspaceRoot, '.refactor-backups');
    this.backupIndex = new Map();
    this.initializeBackupDir();
  }

  private async initializeBackupDir(): Promise<void> {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }

    // Load existing backup index
    try {
      const indexPath = path.join(this.backupDir, 'index.json');
      const indexData = await fs.readFile(indexPath, 'utf8');
      const backups = JSON.parse(indexData) as BackupInfo[];
      
      backups.forEach(backup => {
        this.backupIndex.set(backup.id, {
          ...backup,
          timestamp: new Date(backup.timestamp)
        });
      });
    } catch {
      // Index doesn't exist yet, will be created on first backup
    }
  }

  async createBackup(files: string[], description: string = 'Refactoring backup'): Promise<string> {
    const backupId = this.generateBackupId();
    const backupPath = path.join(this.backupDir, backupId);
    
    await fs.mkdir(backupPath, { recursive: true });

    // Copy files to backup directory
    const copiedFiles: string[] = [];
    for (const filePath of files) {
      try {
        const relativePath = path.relative(process.cwd(), filePath);
        const backupFilePath = path.join(backupPath, relativePath);
        
        // Ensure backup subdirectory exists
        await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
        
        // Copy file
        await fs.copyFile(filePath, backupFilePath);
        copiedFiles.push(relativePath);
      } catch (error) {
        console.warn(`Failed to backup file ${filePath}: ${error}`);
      }
    }

    // Try to get current git commit
    let gitCommit: string | undefined;
    try {
      const { stdout } = await execAsync('git rev-parse HEAD');
      gitCommit = stdout.trim();
    } catch {
      // Git not available or not in a git repository
    }

    // Create backup info
    const backupInfo: BackupInfo = {
      id: backupId,
      timestamp: new Date(),
      files: copiedFiles,
      description,
      gitCommit
    };

    this.backupIndex.set(backupId, backupInfo);
    await this.saveBackupIndex();

    console.log(`Created backup ${backupId} with ${copiedFiles.length} files`);
    return backupId;
  }

  async restoreBackup(backupId: string): Promise<void> {
    const backupInfo = this.backupIndex.get(backupId);
    if (!backupInfo) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const backupPath = path.join(this.backupDir, backupId);
    
    // Restore files
    for (const relativePath of backupInfo.files) {
      const backupFilePath = path.join(backupPath, relativePath);
      const originalFilePath = path.resolve(process.cwd(), relativePath);
      
      try {
        // Ensure target directory exists
        await fs.mkdir(path.dirname(originalFilePath), { recursive: true });
        
        // Restore file
        await fs.copyFile(backupFilePath, originalFilePath);
      } catch (error) {
        console.warn(`Failed to restore file ${relativePath}: ${error}`);
      }
    }

    console.log(`Restored backup ${backupId} with ${backupInfo.files.length} files`);
  }

  async listBackups(): Promise<BackupInfo[]> {
    return Array.from(this.backupIndex.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async deleteBackup(backupId: string): Promise<void> {
    const backupInfo = this.backupIndex.get(backupId);
    if (!backupInfo) {
      throw new Error(`Backup ${backupId} not found`);
    }

    const backupPath = path.join(this.backupDir, backupId);
    
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
      this.backupIndex.delete(backupId);
      await this.saveBackupIndex();
      
      console.log(`Deleted backup ${backupId}`);
    } catch (error) {
      throw new Error(`Failed to delete backup ${backupId}: ${error}`);
    }
  }

  async cleanupOldBackups(maxAge: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const oldBackups = Array.from(this.backupIndex.values())
      .filter(backup => backup.timestamp < cutoffDate);

    for (const backup of oldBackups) {
      try {
        await this.deleteBackup(backup.id);
      } catch (error) {
        console.warn(`Failed to cleanup backup ${backup.id}: ${error}`);
      }
    }

    console.log(`Cleaned up ${oldBackups.length} old backups`);
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `backup-${timestamp}-${random}`;
  }

  private async saveBackupIndex(): Promise<void> {
    const indexPath = path.join(this.backupDir, 'index.json');
    const backups = Array.from(this.backupIndex.values());
    await fs.writeFile(indexPath, JSON.stringify(backups, null, 2));
  }
}

// Global backup manager instance
let backupManager: BackupManager | null = null;

export async function createBackup(files: string[], description?: string): Promise<string> {
  if (!backupManager) {
    backupManager = new BackupManager();
  }
  return backupManager.createBackup(files, description);
}

export async function restoreBackup(backupId: string): Promise<void> {
  if (!backupManager) {
    backupManager = new BackupManager();
  }
  return backupManager.restoreBackup(backupId);
}

export async function listBackups(): Promise<BackupInfo[]> {
  if (!backupManager) {
    backupManager = new BackupManager();
  }
  return backupManager.listBackups();
}

export async function deleteBackup(backupId: string): Promise<void> {
  if (!backupManager) {
    backupManager = new BackupManager();
  }
  return backupManager.deleteBackup(backupId);
}

export async function cleanupOldBackups(maxAge?: number): Promise<void> {
  if (!backupManager) {
    backupManager = new BackupManager();
  }
  return backupManager.cleanupOldBackups(maxAge);
}
