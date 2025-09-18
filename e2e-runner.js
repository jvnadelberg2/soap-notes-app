const { spawn } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const { randomUUID } = require('node:crypto');

const PORT = process.env.TEST_PORT || process.env.PORT || '5051';
const BASE = `http://127.0.0.1:${PORT}`;
const AUTH = process.env.AUTH_TOKEN || '';
const STRICT_FINALIZE_200 = process.env.STRICT_FINALIZE_200 ? process.env.STRICT_FINALIZE_200 === '1' : true;

function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

function req(method, path, { json, raw, headers={}, expectBinary=false } = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = BASE.startsWith('https');
    const u = new URL(path, BASE);
    const lib = isHttps ? https : http;
    const body = raw !== undefined ? Buffer.from(String(raw)) :
                 json !== undefined ? Buffer.from(JSON.stringify(json)) : undefined;
    const h = { ...(AUTH ? {'authorization': `Bearer ${AUTH}`} : {}), ...headers };
    if (json !== undefined && !('content-type' in Object.fromEntries(Object.entries(h).map(([k,v])=>[k.toLowerCase(),v])))) {
      h['content-type'] = 'application/json';
    }
    const opts = { method, hostname: u.hostname, port: u.port, path: u.pathname + (u.search || ''), headers: h, timeout: 15000 };
    const rq = lib.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ct = (res.headers['content-type'] || '').toLowerCase();
        if (expectBinary) return resolve({status:res.statusCode, headers:res.headers, body:buf});
        if (ct.startsWith('application/json')) {
          try { return resolve({status:res.statusCode, headers:res.headers, body:JSON.parse(buf.toString('utf8')||'{}')}); }
          catch(e){ return reject(new Error(`Bad JSON at ${method} ${path}: ${e.message}`)); }
        }
        try { return resolve({status:res.statusCode, headers:res.headers, body:JSON.parse(buf.toString('utf8')||'{}')}); }
        catch { return resolve({status:res.statusCode, headers:res.headers, body:buf.toString('utf8')}); }
      });
    });
    rq.on('error', reject);
    if (body) rq.write(body);
    rq.end();
  });
}

async function waitHealth() {
  for (let i=0;i<100;i++){
    try { const r = await req('GET','/health'); if (r.status>=200 && r.status<500) return; } catch {}
    await sleep(200);
  }
  throw new Error('health timeout');
}

function startServer() {
  return new Promise((resolve, reject) => {
    const env = {...process.env, PORT, NODE_ENV: 'test'};
    const child = spawn(process.execPath, ['server.js'], { stdio:'inherit', env });
    child.on('error', reject);
    resolve(child);
  });
}

function fail(msg, extra) {
  if (extra) { try { console.error(typeof extra==='string'?extra:JSON.stringify(extra,null,2)); } catch {} }
  console.error(msg);
  process.exit(1);
}
function warn(msg, extra) {
  if (extra) { try { console.warn(typeof extra==='string'?extra:JSON.stringify(extra,null,2)); } catch {} }
  console.warn('WARN:', msg);
}

(async () => {
  const child = await startServer();
  const tidy = () => { try{ child.kill('SIGINT'); }catch{} };
  process.on('exit', tidy);
  process.on('SIGINT', ()=>process.exit(1));
  await waitHealth();

  const uuid = randomUUID();

  let r = await req('PUT', `/api/notes/${encodeURIComponent(uuid)}`, { json:{ noteType:'SOAP', text:'E2E create' }});
  if (!(r.status===200 || r.status===201)) fail(`Create failed: ${r.status}`, r.body);

  r = await req('GET', `/api/notes/${encodeURIComponent(uuid)}`);
  if (r.status!==200) fail(`Read failed: ${r.status}`, r.body);
  const readNote = r.body && (r.body.note || r.body);
  if (!readNote || readNote.uuid !== uuid) fail('Read payload missing uuid', r.body);

  r = await req('PUT', `/api/notes/${encodeURIComponent(uuid)}`, { json:{ noteType:'SOAP', text:'E2E updated' }});
  if (r.status!==200) fail(`Update failed: ${r.status}`, r.body);

  r = await req('GET', `/api/notes`);
  if (r.status!==200) fail(`List failed: ${r.status}`, r.body);
  const listArr = Array.isArray(r.body) ? r.body : (r.body && Array.isArray(r.body.notes) ? r.body.notes : null);
  if (!Array.isArray(listArr)) fail('List payload not an array', r.body);

  {
    const pre = await req('GET', `/notes/${encodeURIComponent(uuid)}/pdf?format=soap`, { expectBinary:true });
    if (pre.status === 200) {
      warn('Pre-finalize PDF returned 200 (server allows draft PDFs).');
    } else if (!(pre.status >= 400 && pre.status < 500)) {
      fail(`Pre-finalize PDF expected 200 or 4xx, got ${pre.status}`, pre.headers);
    }
  }

  r = await req('POST', `/api/notes/${encodeURIComponent(uuid)}/finalize`);
  if (STRICT_FINALIZE_200) {
    if (r.status!==200) fail(`Finalize expected 200, got ${r.status}`, r.body);
  } else {
    if (r.status!==200 && r.status!==409) fail(`Finalize failed: ${r.status}`, r.body);
  }
  if (r.status===200) {
    const fin = r.body && (r.body.note || r.body);
    if (!fin.finalizedAt) fail('Finalize payload missing finalizedAt', r.body);
    if (!fin.signature) fail('Finalize payload missing signature', r.body);
  }

  {
    const fin2 = await req('POST', `/api/notes/${encodeURIComponent(uuid)}/finalize`);
    if (fin2.status !== 409) fail(`Second finalize expected 409, got ${fin2.status}`, fin2.body);
  }

  r = await req('PUT', `/api/notes/${encodeURIComponent(uuid)}`, { json:{ text:'should fail' }});
  if (r.status!==409) fail(`Immutability expected 409, got ${r.status}`, r.body);

  {
    const del = await req('DELETE', `/api/notes/${encodeURIComponent(uuid)}`);
    if (del.status !== 409) fail(`Delete after finalize expected 409, got ${del.status}`, del.body);
  }

  r = await req('GET', `/notes/${encodeURIComponent(uuid)}/pdf?format=soap`, { expectBinary:true });
  if (r.status!==200) fail(`PDF SOAP failed: ${r.status}`, r.headers);
  if (!/^application\/pdf/i.test(r.headers['content-type']||'')) fail('PDF SOAP bad content-type', r.headers);
  if (!(r.body && r.body.length>4 && r.body[0]===0x25)) fail('PDF SOAP magic missing');

  r = await req('GET', `/notes/${encodeURIComponent(uuid)}/pdf?format=birp`, { expectBinary:true });
  if (r.status!==200) fail(`PDF BIRP failed: ${r.status}`, r.headers);
  if (!/^application\/pdf/i.test(r.headers['content-type']||'')) fail('PDF BIRP bad content-type', r.headers);
  if (!(r.body && r.body.length>4 && r.body[0]===0x25)) fail('PDF BIRP magic missing');

  const badUuid = randomUUID();
  r = await req('PUT', `/api/notes/${encodeURIComponent(badUuid)}`, { headers:{ 'content-type':'text/plain' }, raw:'not-json' });
  if (r.status!==415) fail(`Content-Type enforcement expected 415, got ${r.status}`, r.body);

  r = await req('GET', `/api/notes/00000000-0000-4000-8000-000000000000`);
  if (r.status!==404) fail(`Unknown UUID expected 404, got ${r.status}`, r.body);

  console.log(`OK base=/api/notes uuid=${uuid} finalize=strict:${STRICT_FINALIZE_200 ? 'on':'off'} pdf=soap+birp validated (pre-finalize PDF: WARN if 200)`);
  process.exit(0);
})().catch(e => fail(e.message));
