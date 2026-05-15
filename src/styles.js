import { C } from './constants';

// ===== SHARED STYLES =====

export const sCard = {
  background: C.card,
  borderRadius: 20,
  border: `1px solid ${C.border}`,
  padding: 20,
  marginBottom: 16,
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.07)',
};

export const sBtn = (primary = true, sm = false) => ({
  padding: sm ? '8px 18px' : '12px 24px',
  borderRadius: 12,
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  background: primary ? `linear-gradient(135deg,${C.red},${C.dark})` : C.light,
  color: primary ? 'white' : C.red,
  fontSize: sm ? 14 : 16,
  fontFamily: 'inherit',
  transition: 'all 0.2s',
  boxShadow: primary ? '0 4px 14px rgba(183,28,28,0.3)' : 'none',
  letterSpacing: primary ? '0.2px' : 'normal',
});

export const sInp = {
  padding: '12px 16px',
  borderRadius: 12,
  border: `1.5px solid ${C.border}`,
  width: '100%',
  fontSize: 15,
  background: '#FFFFFF',
  color: C.text,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border 0.2s, box-shadow 0.2s',
  outline: 'none',
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};

export const sTab = (active) => ({
  padding: '10px 18px',
  borderRadius: 12,
  cursor: 'pointer',
  border: 'none',
  fontWeight: active ? 700 : 500,
  background: active ? `linear-gradient(135deg,${C.red},${C.dark})` : 'transparent',
  color: active ? 'white' : C.muted,
  fontSize: 14,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  transition: 'all 0.2s',
  boxShadow: active ? '0 3px 10px rgba(183,28,28,0.25)' : 'none',
});

export const sLabel = {
  fontSize: 13,
  color: C.muted,
  marginBottom: 6,
  display: 'block',
  fontWeight: 600,
  letterSpacing: '0.1px',
};
