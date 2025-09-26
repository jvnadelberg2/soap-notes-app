/* BEGIN:ARCH-COMMENT
File: services/retention.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: pruneNotes, schedulePrune
Notes: Exports a module API.
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

async function safeStat(p){ try{ return await fsp.stat(p) }catch{ return null } }
async function listFiles(dir){
  const st = await safeStat(dir);
  if(!st || !st.isDirectory()) return [];
  const names = await fsp.readdir(dir);
  const files = [];
  for(const name of names){
    const fp = path.join(dir, name);
    const s = await safeStat(fp);
    if(!s || !s.isFile()) continue;
    files.push({ path: fp, size: s.size, mtimeMs: s.mtimeMs });
  }
  files.sort((a,b)=>a.mtimeMs - b.mtimeMs);
  return files;
}

async function pruneNotes(opts={}){
  const dir = opts.dir || path.join(process.cwd(), 'notes');
  const maxCount = Number.isFinite(opts.maxCount) ? opts.maxCount : 500;
  const maxAgeDays = Number.isFinite(opts.maxAgeDays) ? opts.maxAgeDays : 30;
  const maxSizeMB = Number.isFinite(opts.maxSizeMB) ? opts.maxSizeMB : 512;

  const now = Date.now();
  const cutoffMs = now - (maxAgeDays * 24*60*60*1000);
  const maxBytes = maxSizeMB * 1024 * 1024;

  const files = await listFiles(dir);
  let deleted = 0, bytesFreed = 0;

  for(const f of files){
    if(f.mtimeMs < cutoffMs){
      try{ await fsp.unlink(f.path); deleted++; bytesFreed += f.size; }catch{}
    }
  }

  const remain1 = await listFiles(dir);
  if(remain1.length > maxCount){
    const over = remain1.length - maxCount;
    for(let i=0;i<over;i++){
      const f = remain1[i];
      try{ await fsp.unlink(f.path); deleted++; bytesFreed += f.size; }catch{}
    }
  }

  let remain2 = await listFiles(dir);
  let total = remain2.reduce((a,b)=>a+b.size,0);
  let idx = 0;
  while(total > maxBytes && idx < remain2.length){
    const f = remain2[idx++];
    try{ await fsp.unlink(f.path); deleted++; bytesFreed += f.size; total -= f.size; }catch{}
  }

  return { deleted, bytesFreed };
}

function envNum(name, def){
  const v = process.env[name];
  if(v==null || v==='') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

async function runFromCli(){
  const dir = process.env.NOTES_DIR || path.join(process.cwd(), 'notes');
  const maxCount = envNum('NOTES_MAX_COUNT', 500);
  const maxAgeDays = envNum('NOTES_MAX_AGE_DAYS', 30);
  const maxSizeMB = envNum('NOTES_MAX_SIZE_MB', 512);
  try{
    const r = await pruneNotes({ dir, maxCount, maxAgeDays, maxSizeMB });
    process.stdout.write(JSON.stringify({ ok:true, ...r })+'\n');
  }catch(e){
    process.stdout.write(JSON.stringify({ ok:false, error:String(e) })+'\n');
    process.exitCode = 1;
  }
}

function schedulePrune(opts={}){
  const dir = opts.dir || path.join(process.cwd(), 'notes');
  const maxCount = Number.isFinite(opts.maxCount) ? opts.maxCount : 500;
  const maxAgeDays = Number.isFinite(opts.maxAgeDays) ? opts.maxAgeDays : 30;
  const maxSizeMB = Number.isFinite(opts.maxSizeMB) ? opts.maxSizeMB : 512;
  const intervalMs = Number.isFinite(opts.intervalMs) ? opts.intervalMs : 15*60*1000;

  pruneNotes({ dir, maxCount, maxAgeDays, maxSizeMB }).catch(()=>{});
  setInterval(()=>{ pruneNotes({ dir, maxCount, maxAgeDays, maxSizeMB }).catch(()=>{}); }, intervalMs);
}

if (require.main === module) runFromCli();
module.exports = { pruneNotes, schedulePrune };
