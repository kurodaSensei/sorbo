function CoffeeCard({ tint, eyebrow, name, brand, tags = [], quote, scoreLabel, score, scoreWord, end, onClick, compact, action }) {
  const Tag = onClick ? 'button' : 'div';
  if (window.SORBO_CARD === 'minimal') { const num = score === '—' || !isNaN(parseFloat(score)); return <Tag type={onClick ? 'button' : undefined} className="vcard min" style={{ '--tint': tint }} onClick={onClick}>
    <span className="m-main">
      {eyebrow !== 'Café' && <span className="v-eyebrow sm">— {eyebrow}</span>}
      <span className="m-name">{name}</span>
      {brand && <span className="v-by sm">de {brand}</span>}
      <span className="caption soft m-meta">{[tags.slice(0, 2).join(', ') || (quote && `“${quote}”`), end, !num && `${scoreLabel.toLowerCase()} ${score}`].filter(Boolean).join(' · ')}</span>
    </span>
    <span className="m-side">{action || (num && <span className="m-score">{scoreWord && <span className="m-word">{scoreWord.toLowerCase()}</span>}<span className="m-num">{score}</span></span>)}</span>
  </Tag>; }
  return <Tag type={onClick ? 'button' : undefined} className={'vcard' + (compact ? ' compact' : '')} style={{ '--tint': tint }} onClick={onClick}>
    <span className="v-eyebrow">— {eyebrow}</span>
    <span className="v-name">{name}</span>
    {brand && <span className="v-by">de {brand}</span>}
    {tags.length > 0 && <span className="v-tags">{tags.slice(0, 2).map(f => <span key={f} className="v-tag">{f}</span>)}</span>}
    {quote && <span className="v-quote">“{quote}”</span>}
    <span className="v-foot">
      <span className="v-score-w"><span className="v-eyebrow">— {scoreLabel}</span><span className="v-score">{score}{scoreWord && <span className="v-word">{scoreWord}</span>}</span></span>
      {action || (end && <span className="v-end">{end}</span>)}
    </span>
  </Tag>;
}

function NoteCard({ note, cafe, onClick }) {
  return <CoffeeCard compact tint={tintOf(cafe)} onClick={onClick}
    eyebrow={[note.method, note.hour].filter(Boolean).join(' · ')} name={cafe.name} brand={cafe.brand}
    tags={note.flavors} quote={!note.flavors.length && note.text} scoreLabel="Puntaje" score={note.rating} scoreWord={SCORE[note.rating]} />;
}

function Diario({ app }) {
  const { notes, cafes } = app.s;
  if (!notes.length) return <div className="scr">
    <header className="tab-hdr"><h1 className="title-lg">Diario</h1></header>
    <div className="empty">
      <span className="empty-ic"><Icon n="cup" s={30} w={1.75} /></span>
      <h2 className="empty-t">Tu diario empieza<br />con una taza</h2>
      <p className="body soft">Anota el café que estás tomando hoy. Basta con el nombre y qué tal te supo.</p>
      <button type="button" className="btn primary full" onClick={() => app.openSheet({ type: 'new' })}>Anotar mi primera taza</button>
      <button type="button" className="btn link" onClick={() => app.setTab('amigos')}>Invitar a un amigo</button>
    </div>
    <div className="install"><span className="install-ic"><Icon n="drop" s={20} /></span><span className="row-t"><span className="body-strong sm">Tenlo en tu pantalla de inicio</span><span className="caption soft">Abre como una app, sin tienda</span></span><button type="button" className="btn tiny" onClick={() => app.toast('Instalación: se abre el aviso del navegador')}>Instalar</button></div>
  </div>;
  const groups = [];
  notes.forEach(n => { let g = groups.find(x => x.day === n.day); if (!g) groups.push(g = { day: n.day, items: [] }); g.items.push(n); });
  return <div className="scr">
    <header className="tab-hdr"><h1 className="title-lg">Diario</h1><span className="hdr-actions"><IconBtn n="search" label="Buscar" onClick={() => app.push({ type: 'search' })} /><IconBtn n="bell" label="Notificaciones" dot={app.s.notifs.some(n => n.unread)} onClick={() => app.push({ type: 'notifs' })} /></span></header>
    <div className="stack">
      <button type="button" className="brand-card" onClick={() => app.openSheet({ type: 'new' })}>
        <span className="brand-ic"><Icon n="cup" s={24} w={2} /></span>
        <span className="row-t"><span className="bc-t">¿Qué estás tomando hoy?</span><span className="bc-s">Anótalo en 20 segundos</span></span>
        <Icon n="right" s={20} w={2} />
      </button>
      {groups.map(g => <section key={g.day} className="day"><h2 className="label soft">{g.day}</h2>
        {g.items.map(n => <NoteCard key={n.id} note={n} cafe={cafes.find(c => c.id === n.cafeId)} onClick={() => app.push({ type: 'note', id: n.id })} />)}
      </section>)}
    </div>
  </div>;
}

function FeedCard({ p, app, list }) {
  const wished = app.s.wishlist.some(w => w.name === p.cafe) ;
  const mine = app.s.cafes.some(c => c.name === p.cafe);
  return <article className="feed-card mood" style={{ '--tint': tintOf(p) }}>
    <div className="fc-head">
      <span className="avatar" style={{ background: p.color }}>{p.initial}</span>
      <span className="row-t"><span className="body-strong sm">{p.user}</span><span className="caption soft">{p.when} · {p.method}</span></span>
      {list === 'discover' ? <button type="button" className={'btn tiny' + (p.follows ? ' on' : '')} onClick={() => app.toggleFollow(p.id)}>{p.follows ? 'Siguiendo' : 'Seguir'}</button>
        : null}
    </div>
    <div className="fc-body"><span className="row-t"><span className="coffee-name sm">{p.cafe}</span><span className="body sm">{p.text}</span></span></div>
    <div className="fc-actions">
      <span className="fc-score-a"><span className="m-word">{SCORE[p.rating].toLowerCase()}</span><span className="m-num">{p.rating}</span></span>
      <button type="button" aria-pressed={p.cheered} className={'pill' + (p.cheered ? ' on' : '')} onClick={() => app.toggleCheer(list, p.id)}><Icon n="cup" s={16} w={p.cheered ? 2 : 1.75} />{p.cheered ? `Brindaste · ${p.cheers}` : 'Brindar'}</button>
      {!mine && <button type="button" aria-pressed={wished} className={'pill' + (wished ? ' kept' : '')} onClick={() => app.toggleWish(p)}><Icon n="bookmark" s={16} w={wished ? 2 : 1.75} style={{ fill: wished ? 'currentColor' : 'none' }} />{wished ? 'En tu lista' : 'Quiero probarlo'}</button>}
    </div>
  </article>;
}

function Amigos({ app }) {
  const [tab, setTab] = useState('following');
  const list = tab === 'following' ? app.s.following : app.s.discover;
  return <div className="scr">
    <header className="tab-hdr"><h1 className="title-lg">Amigos</h1><IconBtn n="userPlus" label="Invitar amigos" onClick={() => app.toast('Enlace de invitación copiado')} /></header>
    <div className="pad"><div role="tablist" className="seg">
      <button type="button" role="tab" aria-selected={tab === 'following'} onClick={() => setTab('following')}>Siguiendo</button>
      <button type="button" role="tab" aria-selected={tab === 'discover'} onClick={() => setTab('discover')}>Descubrir</button>
    </div></div>
    <div className="stack tight">
      {tab === 'discover' && <p className="meta soft">Notas públicas de la comunidad</p>}
      {list.map(p => <FeedCard key={p.id} p={p} app={app} list={tab === 'following' ? 'following' : 'discover'} />)}
      {tab === 'following' && <button type="button" className="invite" onClick={() => app.toast('Se abre WhatsApp con tu enlace')}><Icon n="userPlus" s={22} /><span className="row-t"><span className="body-strong sm">Invita a tu gente cafetera</span><span className="meta soft">Comparte tu enlace por WhatsApp</span></span></button>}
    </div>
  </div>;
}

function Preparar({ app }) {
  const [fav, ...rest] = [...app.s.recipes].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
  return <div className="scr">
    <header className="tab-hdr"><h1 className="title-lg">Preparar</h1><IconBtn n="plus" label="Nueva receta" onClick={() => app.toast('Nueva receta: sin rediseño en v2')} /></header>
    <div className="stack">
      <section className="recipe-hero">
        <span className="meta soft">Tu receta de siempre</span>
        <span className="rh-name">{fav.name}</span>
        <span className="data">{fav.dose} g · {fav.water} ml · {fav.temp} °C · {fmt(fav.total)}</span>
        <button type="button" className="btn primary" onClick={() => app.push({ type: 'timer', id: fav.id })}><Icon n="play" s={18} w={2} />Empezar</button>
      </section>
      <Group title="Mis recetas">{rest.map(r => <Row key={r.id} title={r.name} sub={`${r.dose} g · ${r.water} ml · ${fmt(r.total)}`} mono onClick={() => app.push({ type: 'timer', id: r.id })} />)}</Group>
      <Group title="Herramientas">
        <Row icon="timer" title="Temporizador libre" onClick={() => app.push({ type: 'timer' })} />
        <Row icon="calc" title="Calculadora de ratio" onClick={() => app.push({ type: 'ratio' })} />
        <Row icon="drop" title="El Vertido" sub="Preparación guiada paso a paso" onClick={() => app.toast('El Vertido: pantalla existente, sin rediseño')} />
      </Group>
    </div>
  </div>;
}

function Yo({ app }) {
  const { notes, cafes, wishlist } = app.s;
  const [remind, setRemind] = useState(true);
  return <div className="scr">
    <header className="yo-hdr"><span className="yo-av">A</span><span className="row-t"><h1 className="yo-name">Alfredo</h1><button type="button" className="btn link sm" onClick={() => app.toast('Editar perfil: sin destino en v2')}>Editar perfil</button></span></header>
    <div className="stats">
      <div><span className="stat-n">{notes.length}</span><span className="caption soft">notas</span></div>
      <div><span className="stat-n">{cafes.length}</span><span className="caption soft">cafés</span></div>
      <div><span className="stat-n">5 sem</span><span className="caption soft">seguidas</span></div>
    </div>
    <div className="stack">
      <Group title="Mi colección">
        <Row title="Mis cafés" end={`${cafes.length} ›`} onClick={() => app.push({ type: 'cafes', filter: 'recent' })} />
        <Row title="Quiero probar" end={`${wishlist.length} ›`} onClick={() => app.push({ type: 'cafes', filter: 'wish' })} />
      </Group>
      <Group title="Hábito">
        <div className="row static"><span className="row-t"><span>Recordarme a la hora del café</span><span className="caption soft">Todos los días · 8:00</span></span><Switch on={remind} onChange={setRemind} label="Recordatorio diario" /></div>
      </Group>
      <Group title="Cuenta">
        <Row title="Personalizar listas" sub="Métodos, variedades, procesos, sabores" onClick={() => app.toast('Personalizar listas: sin rediseño en v2')} />
        <Row title="Ajustes" onClick={() => app.toast('Ajustes: sin rediseño en v2')} />
      </Group>
    </div>
  </div>;
}

function TabBar({ tab, setTab, onPlus }) {
  const t = (id, n, label) => <button type="button" className={'tab' + (tab === id ? ' on' : '')} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}><Icon n={n} s={24} w={tab === id ? 2 : 1.75} />{label}</button>;
  return <nav className="tabbar" aria-label="Navegación">
    {t('diario', 'book', 'Diario')}{t('amigos', 'users', 'Amigos')}
    <button type="button" className="plus" aria-label="Anotar taza" onClick={onPlus}><Icon n="plus" s={26} w={2.25} /></button>
    {t('preparar', 'timer', 'Preparar')}{t('yo', 'user', 'Yo')}
  </nav>;
}

Object.assign(window, { CoffeeCard, NoteCard, Diario, Amigos, Preparar, Yo, TabBar });
