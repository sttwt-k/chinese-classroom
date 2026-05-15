import React, { useEffect } from 'react';

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (msg) {
      const t = setTimeout(onClose, 2800);
      return () => clearTimeout(t);
    }
  }, [msg, onClose]);

  if (!msg) return null;

  return (
    <div style={{
      position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)',
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color:'white', padding:'12px 24px', borderRadius:24,
      fontSize:15, fontWeight:600,
      boxShadow:'0 4px 16px rgba(0,0,0,0.2)',
      zIndex:400, maxWidth:'90%', textAlign:'center', fontFamily:'inherit',
    }}>
      {msg}
    </div>
  );
}
