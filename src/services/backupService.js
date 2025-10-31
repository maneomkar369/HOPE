const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'finance.db');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'data', 'backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Create a database backup
 */
function createBackup() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.error('[Backup] Database file not found');
      return { success: false, error: 'Database file not found' };
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `finance_backup_${timestamp}.db`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);

    // Copy database file
    fs.copyFileSync(DB_PATH, backupPath);

    const stats = fs.statSync(backupPath);
    console.log(`[Backup] Created backup: ${backupFilename} (${(stats.size / 1024).toFixed(2)} KB)`);

    return {
      success: true,
      filename: backupFilename,
      path: backupPath,
      size: stats.size,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * List all backups
 */
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => b.created - a.created); // Most recent first

    return files;
  } catch (error) {
    console.error('[Backup] Failed to list backups:', error.message);
    return [];
  }
}

/**
 * Delete old backups (keep only last N backups)
 */
function cleanOldBackups(keepCount = 30) {
  try {
    const backups = listBackups();
    
    if (backups.length <= keepCount) {
      return { success: true, deleted: 0 };
    }

    const toDelete = backups.slice(keepCount);
    let deletedCount = 0;

    toDelete.forEach(backup => {
      try {
        fs.unlinkSync(backup.path);
        deletedCount++;
        console.log(`[Backup] Deleted old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`[Backup] Failed to delete ${backup.filename}:`, error.message);
      }
    });

    return { success: true, deleted: deletedCount };
  } catch (error) {
    console.error('[Backup] Failed to clean old backups:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a specific backup
 */
function deleteBackup(filename) {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    fs.unlinkSync(backupPath);
    console.log(`[Backup] Deleted backup: ${filename}`);
    
    return { success: true };
  } catch (error) {
    console.error(`[Backup] Failed to delete backup ${filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Restore database from backup
 */
function restoreBackup(filename) {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);
    
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'Backup file not found' };
    }

    // Create a backup of current database before restoring
    const preRestoreBackup = createBackup();
    if (!preRestoreBackup.success) {
      return { success: false, error: 'Failed to create pre-restore backup' };
    }

    // Restore backup
    fs.copyFileSync(backupPath, DB_PATH);
    console.log(`[Backup] Restored database from: ${filename}`);
    
    return {
      success: true,
      preRestoreBackup: preRestoreBackup.filename
    };
  } catch (error) {
    console.error(`[Backup] Failed to restore backup ${filename}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get backup directory size
 */
function getBackupStats() {
  try {
    const backups = listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    
    return {
      count: backups.length,
      totalSize,
      oldestBackup: backups.length > 0 ? backups[backups.length - 1].created : null,
      newestBackup: backups.length > 0 ? backups[0].created : null
    };
  } catch (error) {
    console.error('[Backup] Failed to get backup stats:', error.message);
    return {
      count: 0,
      totalSize: 0,
      oldestBackup: null,
      newestBackup: null
    };
  }
}

/**
 * Start automated backup cron job
 * Runs daily at 2 AM
 */
function startAutomatedBackup() {
  // Run daily at 2:00 AM
  cron.schedule('0 2 * * *', () => {
    console.log('[Backup] Running automated backup...');
    const result = createBackup();
    
    if (result.success) {
      // Clean old backups, keep last 30
      cleanOldBackups(30);
    }
  });

  console.log('[Backup] Automated backup job scheduled (daily at 2:00 AM)');
}

module.exports = {
  createBackup,
  listBackups,
  deleteBackup,
  restoreBackup,
  cleanOldBackups,
  getBackupStats,
  startAutomatedBackup
};
