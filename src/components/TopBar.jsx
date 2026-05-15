import React, { useState, useEffect } from 'react';
import { C } from '../constants';

// saveStatus: 'idle' | 'saving' | 'saved' | 'error'
function SaveDot({ status }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status === 'saving' || status === 'error') {
      setVisible(true);
    } else if (status === 'saved') {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [status]);

  if (!visible) return null;

  const cfg = {
    saving: { color: '#FCD34D', label: 'กำลังบันทึก…' },
    saved:  { color: '#4ADE80', label: 'บันทึกแล้ว ✓' },
    error:  { color: '#F87171', label: '⚠ บันทึกไม่ได้' },
  }[status] || null;

  if (!cfg) return null;

  return (
    <div style={{
      position: 'absolute', bottom: -22, left: '50%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.55)', color: 'white',
      fontSize: 11, fontWeight: 500, padding: '2px 10px', borderRadius: 20,
      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5,
      pointerEvents: 'none',
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: cfg.color,
        display: 'inline-block',
        animation: status === 'saving' ? 'pulse 1s ease-in-out infinite' : 'none',
      }}/>
      {cfg.label}
    </div>
  );
}

export default function TopBar({ onMenu, onLogout, label, appName, saveStatus = 'idle' }) {
  return (
    <div style={{
      background: `linear-gradient(135deg,${C.red},${C.dark})`,
      color: 'white', padding: '10px 14px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 4px 20px rgba(183,28,28,0.35)',
    }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

      {/* Hamburger */}
      <button
        onClick={onMenu}
        style={{
          background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
          width: 42, height: 42, borderRadius: 14, cursor: 'pointer', fontSize: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >☰</button>

      {/* Center: app name + current page */}
      <div style={{ flex: 1, textAlign: 'center', position: 'relative', padding: '0 8px' }}>
        <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', lineHeight: 1.2 }}>
          {appName}
        </div>
        {label && (
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 400, marginTop: 2 }}>{label}</div>
        )}
        <SaveDot status={saveStatus}/>
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        style={{
          background: 'rgba(255,255,255,0.18)', border: 'none', color: 'white',
          width: 42, height: 42, borderRadius: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
      </button>
    </div>
  );
}
