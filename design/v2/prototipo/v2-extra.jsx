const NEW_PROC_COLORS = ['oklch(0.86 0.05 250)', 'oklch(0.87 0.05 200)', 'oklch(0.88 0.06 125)', 'oklch(0.86 0.06 55)', 'oklch(0.85 0.045 285)', 'oklch(0.85 0.05 0)'];

function ProcessPicker({ app, value, onChange }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const used = app.s.processes.map(p => p.color);
  const [color, setColor] = useState(NEW_PROC_COLORS.find(c => !used.includes(c)) || NEW_PROC_COLORS[0]);
  const exists = app.s.processes.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
  const add = () => { const n = name.trim(); app.addProcess({ name: n, color }); onChange(n); setAdding(false); setName(''); app.toast(`Proceso «${n}» añadido a tus listas`); };
  return <div className="col10">
    <span className="label soft">Proceso</span>
    <div className="wrap">
      {app.s.processes.map(p => <Chip key={p.name} on={value === p.name} onClick={() => onChange(value === p.name ? '' : p.name)}><span className="proc-dot" style={{ background: p.color }}></span>{p.name}</Chip>)}
      {!adding && <Chip dashed onClick={() => setAdding(true)}>+ Nuevo proceso</Chip>}
    </div>
    {adding && <div className="new-proc">
      <Field label="Nombre del proceso"><input className="inp" autoFocus value={name} placeholder="Maceración carbónica" onChange={e => setName(e.target.value)} /></Field>
      <div className="col8"><span className="label soft">Color de la tarjeta</span>
        <div className="swatches" role="radiogroup" aria-label="Color de la tarjeta">
          {NEW_PROC_COLORS.map(c => <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={'Color ' + (NEW_PROC_COLORS.indexOf(c) + 1)} className={'sw' + (color === c ? ' on' : '')} onClick={() => setColor(c)}><span style={{ background: c }}>{color === c && <Icon n="check" s={16} w={2.25} />}</span></button>)}
        </div>
      </div>
      <div className="np-prev"><Thumb tint={color} /><span className="row-t"><span className="coffee-name sm">Así se verá</span><span className="caption soft">{name.trim() || 'Nuevo proceso'}</span></span></div>
      {exists && <span className="caption err">Ya tienes un proceso con ese nombre</span>}
      <div className="np-actions"><button type="button" className="btn link soft" onClick={() => { setAdding(false); setName(''); }}>Cancelar</button><button type="button" className="btn secondary" disabled={!name.trim() || exists} onClick={add}>Añadir proceso</button></div>
    </div>}
  </div>;
}

function Notifications({ app }) {
  const { notifs } = app.s;
  useEffect(() => { const t = setTimeout(app.markRead, 1200); return () => clearTimeout(t); }, []);
  const go = n => {
    if (n.noteId) app.push({ type: 'note', id: n.noteId });
    else if (n.kind === 'tried') app.push({ type: 'cafes', filter: 'wish' });
    else if (n.kind === 'remind') app.openSheet({ type: 'new' });
  };
  const item = n => {
    const d = n.userId && app.s.discover.find(p => p.id === n.userId);
    return <li key={n.id} className={'notif' + (n.unread ? ' unread' : '')}>
      <button type="button" className="notif-main" onClick={() => go(n)} disabled={n.kind === 'follow'}>
        {n.who ? <span className="avatar" style={{ background: n.color }}>{n.who[0]}</span> : <span className="avatar ic"><Icon n="cup" s={18} /></span>}
        <span className="row-t"><span className="body sm">{n.who && <b>{n.who} </b>}{n.text}</span><span className="caption soft">{n.when}</span></span>
      </button>
      {n.kind === 'follow' && d ? <button type="button" className={'btn tiny' + (d.follows ? ' on' : '')} onClick={() => app.toggleFollow(d.id)}>{d.follows ? 'Siguiendo' : 'Seguir'}</button>
        : n.unread && <span className="unread-dot" aria-label="Sin leer"></span>}
    </li>;
  };
  const nuevas = notifs.filter(n => n.fresh), antes = notifs.filter(n => !n.fresh);
  return <div className="scr no-tab">
    <PushHeader title="Notificaciones" onBack={app.pop} />
    <div className="stack">
      {nuevas.length > 0 && <section className="col8"><h2 className="label soft">Nuevas</h2><ul className="nlist">{nuevas.map(item)}</ul></section>}
      {antes.length > 0 && <section className="col8"><h2 className="label soft">Anteriores</h2><ul className="nlist">{antes.map(item)}</ul></section>}
    </div>
  </div>;
}

function Search({ app }) {
  const [q, setQ] = useState('');
  const { cafes, notes } = app.s;
  const k = q.trim().toLowerCase();
  const has = t => (t || '').toLowerCase().includes(k);
  const cs = k ? cafes.filter(c => has(c.name) || has(c.brand) || has(c.process) || has(c.origin) || has(c.variety)) : [];
  const ns = k ? notes.filter(n => { const c = cafes.find(x => x.id === n.cafeId); return has(c.name) || has(n.method) || has(n.text) || n.flavors.some(has); }) : [];
  return <div className="scr no-tab">
    <header className="search-hdr">
      <label className="search grow"><Icon n="search" s={20} /><input autoFocus placeholder="Café, marca, sabor o método" value={q} onChange={e => setQ(e.target.value)} />{q && <button type="button" className="clear" aria-label="Borrar búsqueda" onClick={() => setQ('')}><Icon n="x" s={16} w={2} /></button>}</label>
      <button type="button" className="btn link" onClick={app.pop}>Cancelar</button>
    </header>
    {!k ? <div className="stack">
      <section className="col10"><h2 className="label soft">Búsquedas recientes</h2><div className="wrap">{['Geisha', 'V60', 'Panela'].map(t => <Chip key={t} onClick={() => setQ(t)}>{t}</Chip>)}</div></section>
      <section className="col10"><h2 className="label soft">Por sabor</h2><div className="wrap">{FLAVORS.map(t => <Chip key={t} onClick={() => setQ(t)}>{t}</Chip>)}</div></section>
      <section className="col10"><h2 className="label soft">Por proceso</h2><div className="wrap">{app.s.processes.map(p => <Chip key={p.name} onClick={() => setQ(p.name)}><span className="proc-dot" style={{ background: p.color }}></span>{p.name}</Chip>)}</div></section>
    </div>
    : !cs.length && !ns.length ? <div className="empty sm"><h2 className="empty-t sm">Sin resultados</h2><p className="body soft">No hay cafés ni notas con «{q.trim()}». Prueba con un sabor o un método.</p></div>
    : <div className="stack">
      {cs.length > 0 && <Group title={`Cafés · ${cs.length}`}>{cs.map(c => <button key={c.id} type="button" className="row" onClick={() => app.push({ type: 'editCafe', id: c.id })}><Thumb tint={tintOf(c)} /><span className="row-t"><span>{c.name}</span><span className="caption soft">{[c.brand, c.process].filter(Boolean).join(' · ')}</span></span><span className="soft row-e">›</span></button>)}</Group>}
      {ns.length > 0 && <section className="day"><h2 className="label soft">Notas · {ns.length}</h2>{ns.map(n => <NoteCard key={n.id} note={n} cafe={cafes.find(c => c.id === n.cafeId)} onClick={() => app.push({ type: 'note', id: n.id })} />)}</section>}
    </div>}
  </div>;
}

Object.assign(window, { ProcessPicker, Notifications, Search, NEW_PROC_COLORS });
