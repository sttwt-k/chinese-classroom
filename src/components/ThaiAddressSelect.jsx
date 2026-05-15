import React, { useState, useEffect } from 'react';
import { sInp, sLabel } from '../styles';
import { C } from '../constants';

// ─── โหลดข้อมูลจังหวัด/อำเภอ/ตำบล จาก CDN ────────────────────────────────
// ข้อมูลจาก: github.com/kongvut/thai-province-data (Public Domain)
// โครงสร้าง: [{id, name_th, amphure:[{id,name_th,tambon:[{id,name_th,zip_code}]}]}]
// cache ไว้ใน module-level ไม่ต้องโหลดซ้ำในรอบเดียวกัน

const DATA_URL =
  'https://cdn.jsdelivr.net/gh/kongvut/thai-province-data@master/api_province_with_amphure_tambon.json';

let _cache = null;
let _pending = null;

function fetchGeo() {
  if (_cache) return Promise.resolve(_cache);
  if (_pending) return _pending;
  _pending = fetch(DATA_URL)
    .then(r => r.json())
    .then(d => { _cache = d; _pending = null; return d; })
    .catch(e => { _pending = null; throw e; });
  return _pending;
}

// ─── Styled select ──────────────────────────────────────────────────────────
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
            paddingRight: 36,
            appearance: 'none',
            WebkitAppearance: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            background: '#fff',
          }}
        >
          <option value="">{placeholder || '-- เลือก --'}</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* dropdown arrow */}
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none', color: C.muted, fontSize: 12,
        }}>▼</div>
      </div>
    </div>
  );
}

// ─── Fallback: ช่องพิมพ์ธรรมดา เมื่อโหลดข้อมูลไม่ได้ ─────────────────────
function ManualInputs({ province, district, subDistrict, postalCode, onChange }) {
  const upd = (k, v) => onChange({ province, district, subDistrict, postalCode, [k]: v });
  const inp = (label, k, val, ph) => (
    <div style={{ marginBottom: 12 }}>
      <label style={sLabel}>{label}</label>
      <input value={val || ''} onChange={e => upd(k, e.target.value)} style={sInp} placeholder={ph}/>
    </div>
  );
  return (
    <>
      {inp('จังหวัด',         'province',    province,    'เช่น ตาก')}
      {inp('อำเภอ/เขต',      'district',    district,    'เช่น ท่าสองยาง')}
      {inp('ตำบล/แขวง',      'subDistrict', subDistrict, 'เช่น ท่าสองยาง')}
      {inp('รหัสไปรษณีย์',   'postalCode',  postalCode,  '63150')}
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
/**
 * props:
 *   province, district, subDistrict, postalCode  — ค่าปัจจุบัน (string)
 *   onChange({ province, district, subDistrict, postalCode })  — callback เมื่อเลือก
 */
export default function ThaiAddressSelect({
  province = '', district = '', subDistrict = '', postalCode = '',
  onChange,
}) {
  const [geo,     setGeo]     = useState(_cache);
  const [loading, setLoading] = useState(!_cache);
  const [failed,  setFailed]  = useState(false);

  useEffect(() => {
    if (_cache) return;
    setLoading(true);
    fetchGeo()
      .then(d => { setGeo(d); setLoading(false); })
      .catch(() => { setFailed(true); setLoading(false); });
  }, []);

  // ─── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        border: `1px dashed ${C.border}`, borderRadius: 12,
        padding: '16px', textAlign: 'center', marginBottom: 12,
      }}>
        <div style={{ color: C.muted, fontSize: 13 }}>⏳ กำลังโหลดข้อมูลที่อยู่...</div>
        <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>ต้องใช้อินเทอร์เน็ต</div>
      </div>
    );
  }

  // ─── Fallback: โหลดไม่ได้ ───────────────────────────────────────────────
  if (failed || !geo) {
    return (
      <>
        <div style={{
          background: '#fffbf0', border: '1px solid #fed7aa', borderRadius: 8,
          padding: '8px 12px', marginBottom: 12, fontSize: 12, color: '#92400e',
        }}>⚠️ โหลดข้อมูลจังหวัดไม่ได้ · กรุณาพิมพ์เอง</div>
        <ManualInputs
          province={province} district={district}
          subDistrict={subDistrict} postalCode={postalCode}
          onChange={onChange}
        />
      </>
    );
  }

  // ─── Build option lists ──────────────────────────────────────────────────
  const provOptions = geo.map(p => ({ value: p.name_th, label: p.name_th }));

  const provData = geo.find(p => p.name_th === province) || null;
  const distOptions = provData
    ? provData.amphure.map(a => ({ value: a.name_th, label: a.name_th }))
    : [];

  const distData = provData?.amphure.find(a => a.name_th === district) || null;
  const subOptions = distData
    ? distData.tambon.map(t => ({ value: t.name_th, label: t.name_th }))
    : [];

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleProvince = (v) => {
    onChange({ province: v, district: '', subDistrict: '', postalCode: '' });
  };

  const handleDistrict = (v) => {
    const newDist = provData?.amphure.find(a => a.name_th === v);
    const firstZip = newDist?.tambon[0]?.zip_code?.toString() || '';
    onChange({ province, district: v, subDistrict: '', postalCode: firstZip });
  };

  const handleSubDistrict = (v) => {
    const tambon = distData?.tambon.find(t => t.name_th === v);
    const zip = tambon?.zip_code?.toString() || postalCode;
    onChange({ province, district, subDistrict: v, postalCode: zip });
  };

  const handlePostal = (v) => {
    onChange({ province, district, subDistrict, postalCode: v });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Sel
        label="จังหวัด"
        value={province}
        onChange={handleProvince}
        options={provOptions}
        placeholder="-- เลือกจังหวัด --"
      />
      <Sel
        label="อำเภอ/เขต"
        value={district}
        onChange={handleDistrict}
        options={distOptions}
        placeholder={province ? '-- เลือกอำเภอ --' : '-- เลือกจังหวัดก่อน --'}
        disabled={!province}
      />
      <Sel
        label="ตำบล/แขวง"
        value={subDistrict}
        onChange={handleSubDistrict}
        options={subOptions}
        placeholder={district ? '-- เลือกตำบล --' : '-- เลือกอำเภอก่อน --'}
        disabled={!district}
      />
      {/* รหัสไปรษณีย์ — กรอกอัตโนมัติ แต่แก้ได้ */}
      <div style={{ marginBottom: 12 }}>
        <label style={sLabel}>รหัสไปรษณีย์</label>
        <input
          value={postalCode || ''}
          onChange={e => handlePostal(e.target.value)}
          style={{ ...sInp, maxWidth: 140 }}
          placeholder="กรอกอัตโนมัติ"
        />
      </div>
    </>
  );
}
