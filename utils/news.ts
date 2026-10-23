// Tarjeta «Lo nuevo» en Inicio (interruptor «novedades»). Para el próximo anuncio:
// cambia `id`, `since`, el título y las filas. Cada id se muestra una sola vez por cuenta.
export const NEWS = {
  id: '2026-10-compartir',
  /** Solo lo ve quien tenía cuenta antes de esta fecha; quien llega después ya tiene «Empieza aquí». */
  since: new Date('2026-10-18T00:00:00-05:00'),
  eyebrow: 'Lo nuevo · octubre',
  items: [
    { icon: 'lucide:image', title: 'Compártelo como imagen', text: 'Una nota, un café o una receta, listos para tus historias.', to: '/app/tastings' },
    { icon: 'lucide:compass', title: 'La comunidad, en Explora', text: 'Mira qué anotan otros y comparte lo tuyo si quieres.', to: '/app/explore' },
    { icon: 'lucide:users', title: 'Tus amigos', text: 'Comparte con quien elijas y entérate cuando anotan.', to: '/app/friends' },
  ],
}

export function showNews(accountCreatedAt: Date | null, seenId: string | undefined, news = NEWS): boolean {
  return !!accountCreatedAt && accountCreatedAt < news.since && seenId !== news.id
}
