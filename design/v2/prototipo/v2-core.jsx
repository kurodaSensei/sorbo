const { useState, useEffect, useRef, useMemo } = React;

const IC = {
  book: <><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7z"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  timer: <><circle cx="12" cy="14" r="8"/><path d="M10 2h4M12 14l3-3"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 0 0-16 0"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>,
  cup: <><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><path d="M6 2v2M10 2v2M14 2v2"/></>,
  right: <path d="m9 18 6-6-6-6"/>,
  left: <path d="m15 18-6-6 6-6"/>,
  down: <path d="m6 9 6 6 6-6"/>,
  camera: <><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  share: <><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></>,
  repeat: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></>,
  bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>,
  userPlus: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></>,
  play: <path d="M6 3l14 9-14 9z"/>,
  pause: <><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></>,
  x: <path d="M18 6 6 18M6 6l12 12"/>,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  msg: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>,
  story: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></>,
  calc: <><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/></>,
  drop: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>,
  check: <path d="M20 6 9 17l-5-5"/>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
};
function Icon({ n, s = 22, w = 1.75, style }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">{IC[n]}</svg>;
}

const SCORE = ['', 'Meh', 'Bien', 'Rico', 'Muy rico', 'Wow'];
const FLAVORS = ['Frutos rojos', 'Chocolate', 'Panela', 'Cítrico', 'Floral', 'Caramelo', 'Nuez', 'Jazmín'];
const METHODS = ['V60', 'Chemex', 'AeroPress', 'Kalita', 'Espresso', 'Prensa'];
const TINTS = ['#e5b84b', '#96b36a', '#d98a6a', 'var(--surface-strong)', '#96b36a'];

const PROCESSES = ['Lavado', 'Natural', 'Honey', 'Anaeróbico'];
const PROC_TINT = { 'Lavado': 'oklch(0.87 0.045 160)', 'Natural': 'oklch(0.85 0.05 30)', 'Honey': 'oklch(0.88 0.06 85)', 'Anaeróbico': 'oklch(0.84 0.045 320)' };
const tintOf = x => window.SORBO_PROC_COLOR === false ? (x.tint || 'var(--surface-strong)') : ((window.SORBO_PROCS || PROC_TINT)[x.process] || 'var(--surface-strong)');
const SEED = {
  cafes: [
    { id: 'c1', name: 'Rock natural', brand: '[Marca]', tint: TINTS[0], fav: true, origin: 'Huila, Colombia', process: 'Natural', variety: 'Caturra', roast: 'Medio', price: '' },
    { id: 'c2', name: 'Geisha lavado', brand: '[Marca]', tint: TINTS[1], fav: true, origin: '', process: 'Lavado', variety: 'Geisha', roast: 'Claro', price: '' },
    { id: 'c3', name: 'Caturra honey', brand: '[Marca]', tint: TINTS[2], fav: false, origin: '', process: 'Honey', variety: 'Caturra', roast: '', price: '' },
    { id: 'c4', name: 'Pink bourbon', brand: '[Marca]', tint: TINTS[3], fav: false, origin: '', process: '', variety: 'Pink bourbon', roast: '', price: '' },
  ],
  wishlist: [
    { id: 'w1', name: 'Castillo lavado', brand: '[Marca]', process: 'Lavado', from: 'Andrés', tint: TINTS[1] },
    { id: 'w2', name: 'Sidra natural', brand: '[Marca]', process: 'Natural', from: 'Laura', tint: TINTS[4] },
    { id: 'w3', name: 'Tabi anaeróbico', brand: '[Marca]', process: 'Anaeróbico', from: 'Descubrir', tint: TINTS[2] },
  ],
  notes: [
    { id: 'n1', cafeId: 'c1', rating: 4, flavors: ['Frutos rojos', 'Panela'], text: 'Dulce como panela, con un final de fresa. Mejor que la bolsa anterior.', method: 'V60', dose: 15, water: 250, time: '3:10', day: 'Ayer', hour: '8:14', cheers: 3 },
    { id: 'n2', cafeId: 'c2', rating: 5, flavors: ['Jazmín'], text: 'Jazmín clarísimo, lo repito el finde', method: 'Chemex', dose: 30, water: 500, time: '4:20', day: 'Lunes 28', hour: '7:40', cheers: 5 },
    { id: 'n3', cafeId: 'c3', rating: 3, flavors: ['Caramelo'], text: '', method: 'AeroPress', dose: 17, water: 220, time: '2:00', day: 'Lunes 28', hour: '16:05', cheers: 0 },
    { id: 'n4', cafeId: 'c1', rating: 4, flavors: ['Chocolate'], text: '', method: 'V60', dose: 15, water: 250, time: '3:00', day: 'Viernes 25', hour: '8:30', cheers: 1 },
  ],
  following: [
    { id: 'f1', user: 'Laura', initial: 'L', color: '#96b36a', when: 'hace 2 h', method: 'Kalita', cafe: 'Pink bourbon', brand: '[Marca]', process: 'Honey', rating: 5, text: 'Mandarina y té negro. El mejor del mes, sin duda.', cheers: 4, cheered: true, tint: TINTS[2] },
    { id: 'f2', user: 'Andrés', initial: 'A', color: '#e5b84b', when: 'ayer', method: 'Espresso', cafe: 'Castillo lavado', brand: '[Marca]', process: 'Lavado', rating: 3, text: 'Muy ácido en espresso, probaré en filtro.', cheers: 1, cheered: false, tint: TINTS[1] },
  ],
  discover: [
    { id: 'd1', user: 'Marta', initial: 'M', color: '#c9d2b4', when: 'hace 1 h', method: 'V60', cafe: 'Tabi anaeróbico', brand: '[Marca]', process: 'Anaeróbico', rating: 5, text: 'Fermentado pero limpio. Uva y ron.', cheers: 12, cheered: false, tint: TINTS[2], follows: false },
    { id: 'd2', user: 'Tomás', initial: 'T', color: '#d9c9a3', when: 'hace 3 h', method: 'Prensa', cafe: 'Bourbon rosado', brand: '[Marca]', process: 'Lavado', rating: 4, text: 'Cuerpo redondo, cacao y ciruela.', cheers: 7, cheered: false, tint: TINTS[0], follows: false },
    { id: 'd3', user: 'Inés', initial: 'I', color: '#e4e3d2', when: 'hoy', method: 'AeroPress', cafe: 'Sidra natural', brand: '[Marca]', process: 'Natural', rating: 4, text: 'Mucha fruta tropical, mejor frío.', cheers: 9, cheered: false, tint: TINTS[4], follows: true },
  ],
  processes: Object.entries(PROC_TINT).map(([name, color]) => ({ name, color })),
  notifs: [
    { id: 'x1', kind: 'cheer', who: 'Laura', color: '#96b36a', text: 'brindó por tu nota de Rock natural', when: 'hace 20 min', noteId: 'n1', unread: true, fresh: true },
    { id: 'x2', kind: 'follow', who: 'Marta', color: '#c9d2b4', text: 'empezó a seguirte', when: 'hace 2 h', userId: 'd1', unread: true, fresh: true },
    { id: 'x3', kind: 'wish', who: 'Andrés', color: '#e5b84b', text: 'guardó tu Geisha lavado en Quiero probar', when: 'ayer', noteId: 'n2', unread: false },
    { id: 'x4', kind: 'tried', who: 'Laura', color: '#96b36a', text: 'anotó Sidra natural, que tienes en Quiero probar', when: 'ayer', unread: false },
    { id: 'x5', kind: 'remind', text: 'Llevas 5 semanas seguidas anotando. ¿Qué tomas hoy?', when: 'lunes', unread: false },
  ],
  recipes: [
    { id: 'r1', name: 'V60 de todos los días', method: 'V60', dose: 15, water: 250, temp: 93, total: 180, fav: true,
      steps: [{ at: 0, label: 'Bloom', to: 45 }, { at: 45, label: 'Primer vertido', to: 150 }, { at: 90, label: 'Segundo vertido', to: 250 }, { at: 135, label: 'Dejar drenar', to: 250 }] },
    { id: 'r2', name: 'AeroPress invertida', method: 'AeroPress', dose: 17, water: 220, temp: 88, total: 120,
      steps: [{ at: 0, label: 'Verter y remover', to: 220 }, { at: 30, label: 'Infusionar', to: 220 }, { at: 90, label: 'Girar y prensar', to: 220 }] },
    { id: 'r3', name: 'Chemex para dos', method: 'Chemex', dose: 30, water: 500, temp: 94, total: 270,
      steps: [{ at: 0, label: 'Bloom', to: 90 }, { at: 45, label: 'Primer vertido', to: 300 }, { at: 120, label: 'Segundo vertido', to: 500 }, { at: 180, label: 'Dejar drenar', to: 500 }] },
  ],
};

const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function Thumb({ tint, size = 40 }) {
  return <span className="thumb" aria-hidden="true" style={{ width: size, height: size, background: tint || 'var(--surface-strong)' }}></span>;
}
function Chip({ on, children, onClick, dashed, small }) {
  return <button type="button" className={'chip' + (on ? ' on' : '') + (dashed ? ' dashed' : '') + (small ? ' sm' : '')} aria-pressed={onClick ? !!on : undefined} onClick={onClick}>{children}</button>;
}
function Switch({ on, onChange, label }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={'switch' + (on ? ' on' : '')} onClick={() => onChange(!on)}><span></span></button>;
}
function IconBtn({ n, label, onClick, dot, style }) {
  return <button type="button" className="icon-btn" aria-label={label} onClick={onClick} style={style}><Icon n={n} />{dot && <span className="dot"></span>}</button>;
}
function Field({ label, opt, children }) {
  return <label className="field"><span className="label">{label}{opt && <span className="opt"> (opcional)</span>}</span>{children}</label>;
}
function Group({ title, children }) {
  return <section className="grp">{title && <h2 className="label soft">{title}</h2>}<div className="grp-box">{children}</div></section>;
}
function Row({ title, sub, end = '›', onClick, icon, mono }) {
  return <button type="button" className="row" onClick={onClick}>{icon && <Icon n={icon} s={20} />}<span className="row-t"><span>{title}</span>{sub && <span className={mono ? 'data-sm' : 'caption soft'}>{sub}</span>}</span><span className="soft row-e">{end}</span></button>;
}
function ScorePicker({ value, onChange }) {
  return <fieldset className="score-pick"><legend className="label soft">¿Qué tal estuvo?</legend><div>
    {[1, 2, 3, 4, 5].map(v => <button key={v} type="button" aria-pressed={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}><span className="score">{v}</span><span className="caption">{SCORE[v]}</span></button>)}
  </div></fieldset>;
}
function PushHeader({ title, onBack, backLabel = 'Volver', right }) {
  return <header className="push-hdr"><IconBtn n="left" label={backLabel} onClick={onBack} /><h1 className="push-title">{title}</h1><span className="push-r">{right}</span></header>;
}

Object.assign(window, { PROCESSES, PROC_TINT, tintOf, Icon, SCORE, FLAVORS, METHODS, TINTS, SEED, fmt, Thumb, Chip, Switch, IconBtn, Field, Group, Row, ScorePicker, PushHeader });
