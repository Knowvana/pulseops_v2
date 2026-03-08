import fs from 'fs';
import { createApp } from '#root/app.js';

const logFile = 'test-startup-result.txt';
try {
  const app = createApp();
  fs.writeFileSync(logFile, 'SUCCESS: createApp() completed without errors.\n');
  
  // Test that the server can listen
  const server = app.listen(0, async () => {
    const port = server.address().port;
    fs.appendFileSync(logFile, `Server listening on port ${port}\n`);
    
    // Test health endpoint
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      const json = await res.json();
      fs.appendFileSync(logFile, `Health check: ${res.status} — ${JSON.stringify(json)}\n`);
    } catch (e) {
      fs.appendFileSync(logFile, `Health check failed: ${e.message}\n`);
    }

    // Test modules endpoint
    try {
      const res = await fetch(`http://localhost:${port}/api/modules`);
      const json = await res.json();
      fs.appendFileSync(logFile, `Modules list: ${res.status} — ${JSON.stringify(json)}\n`);
    } catch (e) {
      fs.appendFileSync(logFile, `Modules list failed: ${e.message}\n`);
    }

    server.close(() => {
      fs.appendFileSync(logFile, 'Server closed cleanly.\n');
      process.exit(0);
    });
  });
} catch (e) {
  fs.writeFileSync(logFile, `FAILED: ${e.message}\n${e.stack}\n`);
  process.exit(1);
}
