import React from 'react';
import { C, NAV } from '../constants';

export default function Drawer({ open, onClose, current, onNav, data }) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
          zIndex:200, opacity:open ? 1 : 0,
          pointerEvents:open ? 'auto' : 'none',
          transition:'opacity 0.2s', backdropFilter:'blur(2px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position:'fixed', top:0, left:0, bottom:0, width:280,
        background:'white', zIndex:201,
        transform:open ? 'translateX(0)' : 'translateX(-100%)',
        transition:'transform 0.25s',
        boxShadow:'2px 0 24px rgba(0,0,0,0.15)',
        display:'flex', flexDirection:'column',
      }}>
        {/* Header */}
        <div style={{
          background:`linear-gradient(145deg,${C.red},${C.dark})`,
          color:'white', padding:'28px 20px 22px',
          position:'relative', overflow:'hidden',
        }}>
          {/* Decorative circle */}
          <div style={{
            position:'absolute', top:-30, right:-20,
            width:120, height:120, borderRadius:'50%',
            background:'rgba(255,255,255,0.07)',
          }}/>
          <div style={{ position:'relative' }}>
            <div style={{
              width:52, height:52, borderRadius:16,
              background:'rgba(255,255,255,0.2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              marginBottom:14, fontSize:30,
            }}>中</div>
            <div style={{ fontWeight:800, fontSize:17, letterSpacing:'-0.3px' }}>
              {data.appName || 'ห้องเรียนของคุณครูต้นฝน'}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:8, alignItems:'center' }}>
              <div style={{
                fontSize:11, fontWeight:600,
                background:'rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 8px',
              }}>
                ภาคเรียน {data.term}/{data.year}
              </div>
              {data.homeroom && (
                <div style={{
                  fontSize:11, fontWeight:600,
                  background:'rgba(255,255,255,0.2)', borderRadius:6, padding:'3px 8px',
                }}>
                  ห้อง {data.homeroom}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex:1, overflowY:'auto', padding:'10px 12px' }}>
          {NAV.map((n, i) => (
            <div key={n.id}>
              {i === 5 && (
                <div style={{ height:1, background:C.border, margin:'8px 8px 10px' }} />
              )}
              <button
                onClick={() => { onNav(n.id); onClose(); }}
                style={{
                  width:'100%', padding:'12px 14px', border:'none',
                  borderRadius:14,
                  background: current === n.id
                    ? `linear-gradient(135deg,${C.red},${C.dark})`
                    : 'transparent',
                  color: current === n.id ? 'white' : C.text,
                  display:'flex', alignItems:'center', gap:14,
                  cursor:'pointer', fontSize:15,
                  fontWeight: current === n.id ? 700 : 500,
                  fontFamily:'inherit',
                  transition:'all 0.18s',
                  marginBottom:2,
                  boxShadow: current === n.id ? '0 4px 12px rgba(183,28,28,0.25)' : 'none',
                }}
              >
                <span style={{
                  fontSize:18, width:28, height:28, textAlign:'center',
                  lineHeight:'28px',
                  background: current === n.id ? 'rgba(255,255,255,0.2)' : C.bg,
                  borderRadius:8,
                  display:'inline-flex', alignItems:'center', justifyContent:'center',
                }}>{n.icon}</span>
                <span style={{ letterSpacing:'0.1px' }}>{n.label}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
