import log from 'electron-log';

export function initLogger(): void {
  // Mirror Python's RotatingFileHandler: maxBytes=100*1024, backupCount=3
  log.transports.file.maxSize = 100 * 1024;
  log.transports.file.fileName = 'snmpups.log';

  // Format mirrors Python's '%(asctime)s - %(levelname)s - %(message)s'
  log.transports.file.format = '{y}-{m}-{d} {h}:{i}:{s} - {level} - {text}';

  // Keep 3 backup files (electron-log uses archiveLog for rotation)
  log.transports.file.archiveLog = (oldLogFile: { path: string }) => {
    const path = require('path') as typeof import('path');
    const fs = require('fs') as typeof import('fs');

    for (let i = 3; i >= 1; i--) {
      const src = oldLogFile.path.replace(/\.log$/, i === 1 ? '.log' : `.${i - 1}.log`);
      const dest = oldLogFile.path.replace(/\.log$/, `.${i}.log`);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
    }
  };

  // Console transport: info level for development visibility
  log.transports.console.level = 'info';

  // Default file log level: warn (matches Python's CRITICAL-level silence in prod)
  log.transports.file.level = 'warn';
}

export default log;
