function NoteDetail({ app, id }) {
  const n = app.s.notes.find(x => x.id === id);
  if (!n) return null;
  const c = app.s.cafes.find(x => x.id === n.cafeId);
  const all = app.s.notes.filter(x => x.cafeId === c.id);
  const avg = (all.reduce((a, x) => a + x.rating, 0) / all.length).toFixed(1).replace('.0', '');
  return <div className="scr no-tab">
    <div className="detail mood big" style={{ '--tint': tintOf(c) }}>
      <div className="d-bar"><IconBtn n="left" label="Volver" onClick={app.pop} /><IconBtn n="more" label="Más opciones" onClick={() => app.toast('Editar o borrar nota')} /></div>
      <div className="d-top">
        <span className="row-t"><span className="meta soft">{c.brand} · {n.day}, {n.hour}</span>
          <button type="button" className="d-name" onClick={() => app.push({ type: 'editCafe', id: c.id })}>{c.name}<Icon n="right" s={20} w={2} /></button></span>
      </div>
      <div className="d-score"><span className="d-num">{n.rating}</span><span className="d-word">{SCORE[n.rating].toLowerCase()}</span></div>
      {n.flavors.length > 0 && <div className="wrap">{n.flavors.map(f => <span key={f} className="mini-chip lg">{f}</span>)}</div>}
      {n.text && <p className="quote">“{n.text}”</p>}
      <div className="d-grid">
        <div><span className="caption soft">Método</span><span className="body-strong">{n.method}</span></div>
        <div><span className="caption soft">Dosis</span><span className="data">{n.dose}g·{n.water}ml</span></div>
        <div><span className="caption soft">Tiempo</span><span className="data">{n.time}</span></div>
      </div>
      <button type="button" className="line-row" onClick={() => app.push({ type: 'editCafe', id: c.id })}><span className="row-t"><span className="body-strong">Todas tus notas de este café</span><span className="meta soft">{all.length} {all.length === 1 ? 'nota' : 'notas'} · promedio {avg}</span></span><Icon n="right" s={20} /></button>
      {n.cheers > 0 && <span className="meta soft cheers"><Icon n="cup" s={16} />{n.cheers} {n.cheers === 1 ? 'amigo brindó' : 'amigos brindaron'} por esta taza</span>}
    </div>
    <footer className="d-foot">
      <button type="button" className="btn primary" onClick={() => app.openSheet({ type: 'new', prefill: { cafeId: c.id, method: n.method, dose: n.dose, water: n.water, time: n.time } })}><Icon n="repeat" s={18} w={2} />Repetir</button>
      <button type="button" className="btn secondary" onClick={() => app.openSheet({ type: 'share', id: n.id })}><Icon n="share" s={18} w={2} />Compartir</button>
    </footer>
  </div>;
}

function MisCafes({ app, filter: f0 }) {
  const [f, setF] = useState(f0 || 'recent');
  const [q, setQ] = useState('');
  const { cafes, notes, wishlist } = app.s;
  const m = x => (x.name + ' ' + x.brand).toLowerCase().includes(q.toLowerCase());
  const stats = c => { const ns = notes.filter(n => n.cafeId === c.id); return ns.length ? `${ns.length} ${ns.length === 1 ? 'nota' : 'notas'} · promedio ${(ns.reduce((a, n) => a + n.rating, 0) / ns.length).toFixed(1).replace('.0', '')}` : 'sin notas todavía'; };
  const list = f === 'fav' ? cafes.filter(c => c.fav) : cafes;
  return <div className="scr no-tab">
    <PushHeader title="Mis cafés" onBack={app.pop} backLabel="Volver a Yo" right={<IconBtn n="plus" label="Registrar un café" onClick={() => app.push({ type: 'editCafe' })} />} />
    <div className="pad col12">
      <label className="search"><Icon n="search" s={20} /><input placeholder="Buscar café o marca" value={q} onChange={e => setQ(e.target.value)} /></label>
      <div className="hwrap"><Chip on={f === 'recent'} onClick={() => setF('recent')}>Recientes</Chip><Chip on={f === 'fav'} onClick={() => setF('fav')}>Favoritos</Chip><Chip on={f === 'wish'} onClick={() => setF('wish')}>Quiero probar · {wishlist.length}</Chip></div>
    </div>
    {f === 'wish'
      ? (wishlist.filter(m).length ? <div className="vlist">{wishlist.filter(m).map(w => <CoffeeCard key={w.id} tint={tintOf(w)} eyebrow={w.process || 'Café'} name={w.name} brand={w.brand}
          scoreLabel={w.from === 'Descubrir' ? 'Lo viste en' : 'Lo anotó'} score={w.from} action={<button type="button" className="btn tiny solid" onClick={() => app.openSheet({ type: 'new', prefill: { wish: w } })}>Anotar</button>} />)}</div>
        : <p className="body soft pad empty-list">Tu lista está vacía. Toca «Quiero probarlo» en una nota de Amigos para guardarla aquí.</p>)
      : <div className="vlist">{list.filter(m).map(c => { const ns = notes.filter(n => n.cafeId === c.id); const avg = ns.length ? ns.reduce((a, n) => a + n.rating, 0) / ns.length : 0;
          return <CoffeeCard key={c.id} tint={tintOf(c)} onClick={() => app.push({ type: 'editCafe', id: c.id })}
            eyebrow={[c.process, c.origin && c.origin.split(',')[0]].filter(Boolean).join(' · ') || 'Café'} name={c.name} brand={c.brand}
            tags={[...new Set(ns.flatMap(n => n.flavors))]} scoreLabel="Tu promedio" score={ns.length ? avg.toFixed(1).replace('.0', '') : '—'} scoreWord={ns.length ? SCORE[Math.round(avg)] : 'Sin notas'}
            end={ns.length ? `${ns.length} ${ns.length === 1 ? 'nota' : 'notas'}` : ''} />; })}</div>}
  </div>;
}

function Section({ title, sub, children, open: o0 }) {
  const [open, setOpen] = useState(!!o0);
  return <section className={'fold' + (open ? ' open' : '')}>
    <button type="button" className="fold-h" aria-expanded={open} onClick={() => setOpen(!open)}><span className="row-t"><span className="body-strong">{title}</span>{!open && sub && <span className="caption soft">{sub}</span>}</span><Icon n="down" s={20} w={2} /></button>
    {open && <div className="fold-b">{children}</div>}
  </section>;
}

function EditCafe({ app, id }) {
  const existing = app.s.cafes.find(c => c.id === id);
  const [c, setC] = useState(existing || { name: '', brand: '', origin: '', process: '', variety: '', roast: '', price: '', tint: 'var(--surface-strong)' });
  const set = (k, v) => setC({ ...c, [k]: v });
  const ns = existing ? app.s.notes.filter(n => n.cafeId === id) : [];
  const empty = t => t || 'Sin completar';
  return <div className="scr no-tab">
    <PushHeader title={existing ? 'Editar café' : 'Nuevo café'} onBack={app.pop} />
    <div className="pad col20 pb-foot">
      <div className="ec-top">
        <div className="col8 grow"><Field label="Nombre"><input className="inp" value={c.name} placeholder="Nombre del café" onChange={e => set('name', e.target.value)} /></Field>
          <Field label="Marca"><input className="inp" value={c.brand} placeholder="Quién lo tuesta" onChange={e => set('brand', e.target.value)} /></Field></div>
      </div>
      {existing && <p className="meta soft">{ns.length ? `${ns.length} ${ns.length === 1 ? 'nota' : 'notas'} de este café` : 'Todavía no lo has anotado'} · todos los campos son opcionales</p>}
      <div className="folds">
        <Section title="Origen" sub={empty(c.origin)}><Field label="País y región"><input className="inp" value={c.origin} placeholder="Huila, Colombia" onChange={e => set('origin', e.target.value)} /></Field></Section>
        <Section open={!!c.process} title="Proceso y variedad" sub={empty([c.process, c.variety].filter(Boolean).join(' · '))}>
          <ProcessPicker app={app} value={c.process} onChange={v => set('process', v)} />
          <Field label="Variedad"><input className="inp" value={c.variety} placeholder="Caturra, Geisha…" onChange={e => set('variety', e.target.value)} /></Field>
        </Section>
        <Section title="Tueste" sub={empty(c.roast)}><div className="seg three">{['Claro', 'Medio', 'Oscuro'].map(r => <button key={r} type="button" role="tab" aria-selected={c.roast === r} onClick={() => set('roast', r)}>{r}</button>)}</div></Section>
        <Section title="Compra" sub={empty(c.price)}><Field label="Precio de la bolsa"><input className="inp" inputMode="decimal" value={c.price} placeholder="Precio" onChange={e => set('price', e.target.value)} /></Field></Section>
      </div>
    </div>
    <footer className="foot"><button type="button" className="btn primary full" disabled={!c.name.trim()} onClick={() => { app.saveCafe(c); app.pop(); app.toast(existing ? 'Café guardado' : 'Café añadido a Mis cafés'); }}>Guardar café</button></footer>
  </div>;
}

function Timer({ app, id }) {
  const r = app.s.recipes.find(x => x.id === id);
  const [t, setT] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => { if (!run) return; const i = setInterval(() => setT(v => v + 1), 1000); return () => clearInterval(i); }, [run]);
  const done = r ? t >= r.total : (!run && t > 0);
  useEffect(() => { if (r && t >= r.total) setRun(false); }, [t]);
  const si = r ? r.steps.reduce((a, s, i) => t >= s.at ? i : a, 0) : -1;
  const anotar = () => app.openSheet({ type: 'new', prefill: { method: r ? r.method : '', dose: r ? r.dose : '', water: r ? r.water : '', time: fmt(t) } });
  return <div className="scr no-tab">
    <PushHeader title={r ? r.name : 'Temporizador libre'} onBack={app.pop} />
    <div className="pad col20 pb-foot">
      {r && <span className="data soft center">{r.dose} g · {r.water} ml · {r.temp} °C · 1:{(r.water / r.dose).toFixed(1)}</span>}
      <div className="clock"><span className="clock-t">{fmt(t)}</span>{r && <span className="meta soft">de {fmt(r.total)}</span>}
        {r && <span className="bar"><span style={{ width: Math.min(100, t / r.total * 100) + '%' }}></span></span>}
      </div>
      {r && <div className="now"><span className="label soft">{done ? 'Listo' : 'Ahora'}</span><span className="now-t">{done ? 'Tu taza está lista' : r.steps[si].label}</span>{!done && <span className="data">vierte hasta {r.steps[si].to} ml</span>}</div>}
      {r && <ol className="steps">{r.steps.map((s, i) => <li key={i} className={i === si && !done ? 'cur' : (t > s.at && i < si) || done ? 'past' : ''}><span className="data">{fmt(s.at)}</span><span className="grow">{s.label}</span><span className="data soft">{s.to} ml</span></li>)}</ol>}
    </div>
    <footer className="foot timer-foot">
      <button type="button" className="btn secondary sq" aria-label="Reiniciar" onClick={() => { setRun(false); setT(0); }}><Icon n="reset" s={20} w={2} /></button>
      {done ? <button type="button" className="btn primary grow" onClick={anotar}>Anotar esta taza</button>
        : <button type="button" className="btn primary grow" onClick={() => setRun(!run)}><Icon n={run ? 'pause' : 'play'} s={18} w={2} />{run ? 'Pausar' : t ? 'Seguir' : 'Empezar'}</button>}
    </footer>
  </div>;
}

Object.assign(window, { NoteDetail, MisCafes, EditCafe, Timer });
