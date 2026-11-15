import { C } from '../constants';
import { sInp } from '../styles';

export default function ClassPicker({ classes, selected, onChange, emptyLabel, disabled = false }) {
  const toggle = room => {
    const next = new Set(selected);
    if (next.has(room)) next.delete(room);
    else next.add(room);
    onChange(classes.filter(item => next.has(item)));
  };

  return (
    <details style={{ marginBottom: 12 }}>
      <summary style={{ ...sInp, cursor: 'pointer', color: C.text }}>
        {selected.length ? `เลือกแล้ว ${selected.length} ห้อง · ${selected.join(', ')}` : emptyLabel}
      </summary>
      <fieldset aria-label="เลือกห้องเรียน" disabled={disabled} style={{ border: 0, padding: '8px 0 0', margin: 0, minWidth: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(86px, 1fr))', gap: 6 }}>
          {classes.map(room => (
            <label key={room} style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 44, padding: '0 8px', border: `1px solid ${C.border}`, borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={selected.includes(room)} onChange={() => toggle(room)} style={{ accentColor: C.red }} />
              {room}
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} style={{ border: 0, background: 'none', color: C.red, cursor: 'pointer', minHeight: 44, font: 'inherit', fontSize: 14 }}>
            ยกเลิกการเลือกทั้งหมด
          </button>
        )}
      </fieldset>
    </details>
  );
}
