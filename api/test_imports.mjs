// Quick import test for ServiceNow module files
import fs from 'fs';

const results = [];

async function test(name, fn) {
  try {
    await fn();
    results.push(`PASS: ${name}`);
  } catch (e) {
    results.push(`FAIL: ${name} — ${e.message}`);
  }
}

await test('loadJson utility', async () => {
  const { loadJson } = await import('./src/shared/loadJson.js');
  const cfg = loadJson('ServiceNowConfig.json');
  if (!cfg.connection) throw new Error('Missing connection section');
  const mods = loadJson('ModulesConfig.json');
  if (!mods.modules || !mods.modules[0]) throw new Error('Missing modules array');
  if (mods.modules[0].id !== 'servicenow') throw new Error('Expected servicenow module');
});

await test('APIErrors has ServiceNow keys', async () => {
  const { errors } = await import('./src/shared/loadJson.js');
  const keys = ['snConfigLoadFailed','snConfigSaveFailed','snConnectionTestFailed','snConnectionRequired','snStatsFailed','snIncidentsFetchFailed','snSyncFailed','snReportsFailed','snModuleListFailed','snModuleEnableFailed','snModuleDisableFailed'];
  for (const k of keys) {
    if (!errors.errors[k]) throw new Error(`Missing error key: ${k}`);
  }
});

await test('APIMessages has ServiceNow keys', async () => {
  const { messages } = await import('./src/shared/loadJson.js');
  const keys = ['snConfigSaved','snConnectionSuccess','snSyncComplete','snModuleEnabled','snModuleDisabled'];
  for (const k of keys) {
    if (!messages.success[k]) throw new Error(`Missing message key: ${k}`);
  }
});

await test('servicenowService imports', async () => {
  const svc = await import('./src/modules/servicenow/servicenowService.js');
  const fns = ['loadConfig','saveConfig','testConnection','getStats','fetchIncidents','syncIncidents','getReports'];
  for (const fn of fns) {
    if (typeof svc[fn] !== 'function') throw new Error(`Missing export: ${fn}`);
  }
});

await test('servicenowRoutes imports', async () => {
  const mod = await import('./src/modules/servicenow/servicenowRoutes.js');
  if (!mod.default) throw new Error('Missing default export');
});

await test('modulesRoutes imports', async () => {
  const mod = await import('./src/core/routes/modulesRoutes.js');
  if (!mod.default) throw new Error('Missing default export');
});

await test('urls.json has servicenow routes', async () => {
  const { loadJson } = await import('./src/shared/loadJson.js');
  const urls = loadJson('urls.json');
  if (!urls.servicenow) throw new Error('Missing servicenow section');
  if (!urls.servicenow.config) throw new Error('Missing servicenow.config');
  if (!urls.modules.enable) throw new Error('Missing modules.enable');
  if (!urls.modules.disable) throw new Error('Missing modules.disable');
});

// Write results
fs.writeFileSync('./test_results.txt', results.join('\n') + '\n');
console.log(results.join('\n'));
