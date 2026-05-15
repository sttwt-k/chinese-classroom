import React from 'react';
import { C } from '../constants';

export default function Sheet({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
        display:'flex', alignItems:'flex-end', justifyContent:'center',
        zIndex:300, backdropFilter:'blur(2px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background:'white', borderRadius:'24px 24px 0 0', padding:24,
          width:'100%', maxWidth:520, maxHeight:'88vh', overflowY:'auto',
          boxShadow:'0 -4px 24px rgba(0,0,0,0.1)',
        }}
      >
        {title && (
          <div style={{ fontWeight:700, fontSize:18, marginBottom:20, color:C.text }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
