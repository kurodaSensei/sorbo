function NewNote({ app, prefill = {} }) {
  const { cafes, wishlist, notes, recipes } = app.s;
  const pc = prefill.cafeId && cafes.find(c => c.id === prefill.cafeId);
  const [name, setName] = useState(pc ? pc.name : prefill.wish ? prefill.wish.name : '');
  const [brand, setBrand] = useState(pc ? pc.brand : prefill.wish ? prefill.wish.brand : '');
  const [focus, setFocus] = useState(false);
  const [rating, setRating] = useState(0);
  const [flavors, setFlavors] = useState([]);
  const [extra, setExtra] = useState([]);
  const [adding, setAdding] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [text, setText] = useState('');
  const [more, setMore] = useState(false);
  const [share, setShare] = useState(true);
  const match = cafes.find(c => c.name.toLowerCase() === name.trim().toLowerCase());
  const wish = !match && wishlist.find(w => w.name.toLowerCase() === name.trim().toLowerCase());
  const last = match && notes.find(n => n.cafeId === match.id);
  const [d, setD] = useState({ method: prefill.method || '', dose: prefill.dose || '', water: prefill.water || '', time: prefill.time || '' });
  useEffect(() => { if (!prefill.method && last) setD({ method: last.method, dose: last.dose, water: last.water, time: last.time }); }, [match && match.id]);
  const recent = [...new Set(notes.map(n => n.cafeId))].slice(0, 3).map(id => cafes.find(c => c.id === id));
  const q = name.trim().toLowerCase();
  const sugg = focus && q && !match ? [...cafes.map(c => ({ ...c, k: 'mine' })), ...wishlist.map(w => ({ ...w, k: 'wish' }))].filter(x => x.name.toLowerCase().includes(q) && x.name.toLowerCase() !== q).slice(0, 3) : [];
  const pick = c => { setName(c.name); setBrand(c.brand); setFocus(false); };
  const toggle = f => setFlavors(flavors.includes(f) ? flavors.filter(x => x !== f) : [...flavors, f]);
  const ok = name.trim() && rating;
  const ratio = d.dose && d.water ? `1:${(d.water / d.dose).toFixed(1)}` : '—';
  const summary = [d.method, d.dose && `${d.dose} g`].filter(Boolean).join(' · ');
  const helper = match ? `${match.brand} · de tu colección` : wish ? 'De tu lista Quiero probar · sale de la lista al guardar' : q ? 'Café nuevo · se añade a Mis cafés al guardar' : 'Escribe el nombre o elige uno reciente';
  return <div className="sheet-in">
    <div className="grab"><span></span></div>
    <header className="sheet-hdr"><button type="button" className="btn link soft" onClick={app.closeSheet}>Cancelar</button><h1 className="body-strong lg">Nueva nota</h1><span className="sh-sp"></span></header>
    <div className="sheet-body">
      <div className="ec-top">
        <div className="col8 grow rel">
          <Field label="Café"><input className="inp strong" value={name} placeholder="Busca o escribe un café" onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)} onChange={e => setName(e.target.value)} /></Field>
          {sugg.length > 0 && <div className="sugg">{sugg.map(s => <button key={s.id} type="button" onMouseDown={() => pick(s)}><span className="body sm">{s.name}</span><span className="caption soft">{s.k === 'wish' ? 'Quiero probar' : s.brand}</span></button>)}</div>}
          <span className="caption soft">{helper}</span>
        </div>
      </div>
      {q && !match && !wish && <Field label="Marca" opt><input className="inp" value={brand} placeholder="Quién lo tuesta" onChange={e => setBrand(e.target.value)} /></Field>}
      {!prefill.cafeId && <div className="hwrap recents"><span className="caption soft">Recientes</span>{recent.map(c => <Chip key={c.id} small on={match && match.id === c.id} onClick={() => pick(c)}>{c.name}</Chip>)}</div>}
      <ScorePicker value={rating} onChange={setRating} />
      <div className="col10"><span className="label soft">Sabores</span><div className="wrap">
        {[...FLAVORS.slice(0, 5), ...extra].map(f => <Chip key={f} on={flavors.includes(f)} onClick={() => toggle(f)}>{f}</Chip>)}
        {addOpen ? <input className="chip-inp" autoFocus value={adding} placeholder="Sabor" onChange={e => setAdding(e.target.value)} onBlur={() => setAddOpen(false)} onKeyDown={e => { if (e.key === 'Enter' && adding.trim()) { setExtra([...extra, adding.trim()]); setFlavors([...flavors, adding.trim()]); setAdding(''); setAddOpen(false); } }} />
          : <Chip dashed onClick={() => setAddOpen(true)}>+ Otro</Chip>}
      </div></div>
      <Field label="Nota" opt><textarea className="inp ta" rows="2" value={text} placeholder="Lo que se te quedó de esta taza…" onChange={e => setText(e.target.value)} /></Field>
      <section className={'more' + (more ? ' open' : '')}>
        <button type="button" className="fold-h" aria-expanded={more} onClick={() => setMore(!more)}><span className="row-t"><span className="body-strong">Más detalles</span>{!more && <span className="caption soft">{summary ? `${summary}${last && !prefill.method ? ' · como la última vez' : ''}` : 'Método, receta y dosis'}</span>}</span><Icon n="down" s={20} w={2} /></button>
        {more && <div className="fold-b">
          <span className="label soft">Usar una receta</span>
          <div className="hwrap">{recipes.map(r => <Chip key={r.id} small on={d.method === r.method && +d.dose === r.dose} onClick={() => setD({ method: r.method, dose: r.dose, water: r.water, time: fmt(r.total) })}>{r.name}</Chip>)}</div>
          <span className="label soft">Método</span>
          <div className="wrap">{METHODS.map(m => <Chip key={m} on={d.method === m} onClick={() => setD({ ...d, method: m })}>{m}</Chip>)}</div>
          <div className="dgrid">
            <Field label="Dosis (g)"><input className="inp mono" inputMode="decimal" value={d.dose} onChange={e => setD({ ...d, dose: e.target.value })} /></Field>
            <Field label="Agua (ml)"><input className="inp mono" inputMode="decimal" value={d.water} onChange={e => setD({ ...d, water: e.target.value })} /></Field>
            <Field label="Tiempo"><input className="inp mono" value={d.time} placeholder="3:00" onChange={e => setD({ ...d, time: e.target.value })} /></Field>
          </div>
          <span className="meta soft">Ratio <span className="data ink">{ratio}</span></span>
        </div>}
      </section>
    </div>
    <footer className="sheet-foot">
      <div className="share-row"><span className="body sm ic-l"><Icon n="users" s={18} />Compartir con amigos</span><Switch on={share} onChange={setShare} label="Compartir con amigos" /></div>
      <button type="button" className="btn primary full" disabled={!ok} onClick={() => app.saveNote({ name: name.trim(), brand: brand.trim() || '[Marca]', rating, flavors, text: text.trim(), ...d, dose: +d.dose || 0, water: +d.water || 0, time: d.time || '—', share })}>Guardar nota</button>
      {!ok && <span className="caption soft center">{!name.trim() ? 'Escribe el café y elige un puntaje' : 'Elige un puntaje para guardar'}</span>}
    </footer>
  </div>;
}

function ShareSheet({ app, id }) {
  const n = app.s.notes.find(x => x.id === id);
  const c = app.s.cafes.find(x => x.id === n.cafeId);
  return <div className="sheet-in share">
    <div className="grab"><span></span></div>
    <header className="sheet-hdr"><span className="sh-sp"></span><h1 className="body-strong lg">Compartir nota</h1><button type="button" className="btn link soft" onClick={app.closeSheet}>Listo</button></header>
    <div className="sheet-body center-col">
      <div className="story mood big" style={{ '--tint': tintOf(c) }} aria-label="Vista previa de la imagen para compartir">
        <div className="story-body">
          <div className="story-top"><span className="row-t"><span className="st-name">{c.name}</span><span className="caption soft">{c.brand} · {n.method}</span></span><span className="score-badge sm"><span>{n.rating}</span><span className="caption">{SCORE[n.rating]}</span></span></div>
          {n.flavors.length > 0 && <div className="wrap g4">{n.flavors.slice(0, 3).map(f => <span key={f} className="mini-chip">{f}</span>)}</div>}
          {n.text && <p className="st-quote">“{n.text}”</p>}
          <span className="st-foot"><span className="st-logo">Sorbo</span><span className="caption soft">sorbo.app/alfredo</span></span>
        </div>
      </div>
      <div className="share-opts">
        <button type="button" onClick={() => app.toast('Se abre Stories con la imagen')}><span className="so-ic"><Icon n="story" s={22} /></span>Stories</button>
        <button type="button" onClick={() => app.toast('Se abre WhatsApp con la imagen')}><span className="so-ic"><Icon n="msg" s={22} /></span>WhatsApp</button>
        <button type="button" onClick={() => app.toast('Enlace copiado')}><span className="so-ic"><Icon n="link" s={22} /></span>Copiar enlace</button>
      </div>
    </div>
  </div>;
}

Object.assign(window, { NewNote, ShareSheet });
