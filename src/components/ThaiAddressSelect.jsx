import React, { useState, useEffect } from 'react';
import { sInp, sLabel } from '../styles';
import { C } from '../constants';

// ─── Data sources (3 small files instead of 1 giant 5MB file) ─────────────────
// Province  ~3 KB  | Amphure  ~35 KB  | Tambon  ~300 KB
// Total ~340 KB vs old single file ~5 MB — much faster, cached in localStorage
const CDN   = 'https://cdn.jsdelivr.net/gh/kongvut/thai-province-data@master';
const LSKEY = 'thai_geo_v4';
const TTL   = 30 * 86400 * 1000; // cache 30 วัน

// ─── Module-level singleton ────────────────────────────────────────────────────
let _cache   = null;   // {provs, ampsByProvId, tabsByAmpId}
let _loading = false;
let _cbs     = [];     // pending callbacks

function loadGeo() {
  // 1. in-memory hit
  if (_cache) return Promise.resolve(_cache);

  // 2. localStorage hit
  try {
    const raw = localStorage.getItem(LSKEY);
    if (raw) {
      const { d, t } = JSON.parse(raw);
      if (d && Date.now() - t < TTL) { _cache = d; return Promise.resolve(_cache); }
    }
  } catch {}

  // 3. already fetching — queue
  if (_loading) return new Promise((res, rej) => _cbs.push({ res, rej }));

  // 4. fetch three small files in parallel
  _loading = true;
  return new Promise((res, rej) => {
    _cbs.push({ res, rej });
    Promise.all([
      fetch(`${CDN}/api_province.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`${CDN}/api_amphure.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`${CDN}/api_tambon.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ])
    .then(([provs, amps, tabs]) => {
      // Build indexed maps for O(1) cascade lookup
      const ampsByProvId = {};
      amps.forEach(a => {
        (ampsByProvId[a.province_id] ??= []).push({ id: a.id, name: a.name_th });
      });
      const tabsByAmpId = {};
      tabs.forEach(t => {
        (tabsByAmpId[t.amphure_id] ??= []).push({ id: t.id, name: t.name_th, zip: String(t.zip_code || '') });
      });
      const geo = {
        provs: provs.map(p => ({ id: p.id, name: p.name_th })),
        ampsByProvId,
        tabsByAmpId,
      };
      _cache   = geo;
      _loading = false;
      try { localStorage.setItem(LSKEY, JSON.stringify({ d: geo, t: Date.now() })); } catch {}
      _cbs.forEach(cb => cb.res(geo));
      _cbs = [];
    })
    .catch(err => {
      _loading = false;
      _cbs.forEach(cb => cb.rej(err));
      _cbs = [];
    });
  });
}

// ─── Simple styled <select> ────────────────────────────────────────────────────
function Sel({ label, value, onChange, options, placeholder, disabled }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <label style={sLabel}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            ...sInp,
            paddingRight: 36, appearance: 'none', WebkitAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <option value="">{placeholder || '-- เลือก --'}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: C.muted, fontSize: 12,
        }}>▼</div>
      </div>
    </div>
  );
}

// ─── Manual text-input fallback ────────────────────────────────────────────────
function ManualFallback({ province, district, subDistrict, postalCode, onChange }) {
  const upd = (k, v) => onChange({ province, district, subDistrict, postalCode, [k]: v });
  return (
    <>
      {[
        ['จังหวัด',       'province',    province,    'เช่น ตาก'],
        ['อำเภอ/เขต',    'district',    district,    'เช่น แม่สอด'],
        ['ตำบล/แขวง',    'subDistrict', subDistrict, 'เช่น แม่สอด'],
        ['รหัสไปรษณีย์', 'postalCode',  postalCode,  '63110'],
      ].map(([l, k, v, ph]) => (
        <div key={k} style={{ marginBottom: 12 }}>
          <label style={sLabel}>{l}</label>
          <input
            value={v || ''}
            onChange={e => upd(k, e.target.value)}
            style={{ ...sInp, maxWidth: k === 'postalCode' ? 140 : undefined }}
            placeholder={ph}
          />
        </div>
      ))}
    </>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
export default function ThaiAddressSelect({
  province = '', district = '', subDistrict = '', postalCode = '',
  onChange,
}) {
  const [geo,     setGeo]     = useState(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [error,   setError]   = useState(false);

  const doLoad = () => {
    setError(false);
    setLoading(true);
    loadGeo()
      .then(d => { setGeo(d); setLoading(false); })
      .catch(() => { setLoading(false); setError(true); });
  };

  useEffect(() => { if (!_cache) doLoad(); }, []); // eslint-disable-line

  // ── Derive cascade options ─────────────────────────────────────────────────
  const provOpts = geo ? geo.provs.map(p => ({ value: p.name, label: p.name })) : [];

  const provId   = geo?.provs.find(p => p.name === province)?.id ?? null;
  const ampList  = (geo && provId) ? (geo.ampsByProvId[provId] ?? []) : [];
  const ampOpts  = ampList.map(a => ({ value: a.name, label: a.name }));

  const ampId    = ampList.find(a => a.name === district)?.id ?? null;
  const tabList  = (geo && ampId) ? (geo.tabsByAmpId[ampId] ?? []) : [];
  const tabOpts  = tabList.map(t => ({ value: t.name, label: t.name }));

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleProv = v => onChange({ province: v, district: '', subDistrict: '', postalCode: '' });

  const handleDist = v => {
    const newAmpId  = ampList.find(a => a.name === v)?.id;
    const firstZip  = newAmpId ? (geo.tabsByAmpId[newAmpId]?.[0]?.zip ?? '') : '';
    onChange({ province, district: v, subDistrict: '', postalCode: firstZip });
  };

  const handleTab = v => {
    const zip = tabList.find(t => t.name === v)?.zip ?? postalCode;
    onChange({ province, district, subDistrict: v, postalCode: zip });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      border: `1.5px dashed ${C.border}`, borderRadius: 12,
      padding: 16, textAlign: 'center', marginBottom: 12,
    }}>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 4 }}>⏳ กำลังโหลดข้อมูลที่อยู่...</div>
      <div style={{ color: C.muted, fontSize: 12 }}>ต้องใช้อินเทอร์เน็ต · ครั้งแรกอาจใช้เวลาสักครู่</div>
    </div>
  );

  if (error) return (
    <>
      <div style={{
        background: '#fffbf0', border: '1.5px solid #fcd34d', borderRadius: 10,
        padding: '10px 14px', marginBottom: 14,
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 4 }}>
          ⚠️ โหลดข้อมูลจังหวัดไม่สำเร็จ
        </div>
        <div style={{ fontSize: 12, color: '#92400e', marginBottom: 10, lineHeight: 1.6 }}>
          กรุณากรอกเองด้านล่าง หรือกดลองใหม่เมื่อมีสัญญาณอินเทอร์เน็ต
        </div>
        <button
          onClick={doLoad}
          style={{
            padding: '6px 16px', background: '#F59E0B', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: