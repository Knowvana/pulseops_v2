async function test() {
  console.log('--- Testing API ---');
  
  // Health check
  const h = await fetch('http://localhost:4001/api/health');
  console.log('health:', h.status);
  
  // Modules list
  const m = await fetch('http://localhost:4001/api/modules');
  const mj = await m.json();
  console.log('modules:', m.status, 'enabled:', mj.data?.filter(x=>x.enabled).map(x=>x.id));
  
  // Try servicenow with no auth (expect 401 not 404)
  const s1 = await fetch('http://localhost:4001/api/servicenow/config');
  console.log('servicenow/config (no auth):', s1.status, await s1.text().then(t=>t.substring(0,200)));
  
  // Try a totally fake module (should 404)
  const s2 = await fetch('http://localhost:4001/api/fakemodule/test');
  console.log('fakemodule/test:', s2.status);
}
test().catch(e => console.log('ERR:', e.message));
