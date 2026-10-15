export const DEFAULT_PROCESS_OPTIONS = [
  { value: 'washed', label: 'Lavado' },
  { value: 'natural', label: 'Natural' },
  { value: 'honey', label: 'Honey' },
  { value: 'anaerobic', label: 'Anaeróbico' },
  { value: 'carbonic', label: 'Maceración Carbónica' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'other', label: 'Otro' },
]

export const DEFAULT_BREW_METHOD_OPTIONS = [
  { value: 'v60', label: 'V60' },
  { value: 'kalita', label: 'Kalita' },
  { value: 'chemex', label: 'Chemex' },
  { value: 'aeropress', label: 'AeroPress' },
  { value: 'french_press', label: 'Prensa Francesa' },
  { value: 'origami', label: 'Origami' },
  { value: 'suiren', label: 'Suiren' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'moka_pot', label: 'Moka' },
  { value: 'phin', label: 'Phin (Vietnamita)' },
  { value: 'cold_brew', label: 'Cold Brew' },
  { value: 'other', label: 'Otro' },
]

export const DEFAULT_VARIETIES = [
  'Caturra', 'Castillo', 'Colombia', 'Typica', 'Bourbon', 'Gesha', 'Pacamara',
  'Java', 'Tabí', 'Cenicafé 1', 'Pink Bourbon', 'Wush Wush', 'Sidra',
  'Sudan Rume', 'Eugenioides', 'SL28', 'SL34', 'Maragogipe', 'Laurina',
]

export const DEFAULT_FLAVOR_NOTES = [
  'Cereza', 'Vainilla', 'Chocolate', 'Caramelo', 'Naranja', 'Panela',
  'Jazmín', 'Floral', 'Cítrico', 'Nuez', 'Miel', 'Cacao',
]

export const PURCHASE_CHANNEL_OPTIONS = [
  { value: 'website', label: 'Web' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'shop', label: 'Tienda' },
  { value: 'other', label: 'Otro' },
] as const

export const PURCHASE_REFERENCE_PLACEHOLDER: Record<string, string> = {
  website: 'https://librario.co',
  instagram: '@cafedelpueblo',
  whatsapp: '+57 300 123 4567',
  shop: 'Nombre de la tienda',
  other: 'Detalle',
}

export const GRIND_SIZE_OPTIONS = [
  { value: 'fine', label: 'Fina' },
  { value: 'medium_fine', label: 'Media fina' },
  { value: 'medium', label: 'Media' },
  { value: 'medium_coarse', label: 'Media gruesa' },
  { value: 'coarse', label: 'Gruesa' },
] as const

/**
 * Educación sobre los atributos sensoriales de una cata. Pensado para que
 * usuarios casuales que no son baristas puedan puntuar con criterio.
 */
export const TASTING_ATTRIBUTE_INFO = {
  overall: {
    title: 'Puntuación general',
    body: 'El resumen de toda la experiencia. ¿Disfrutaste la taza? ¿La repetirías? Pondera todo lo demás en un solo número.',
    howTo: 'Si tuvieras que recomendar este café a un amigo en una sola escala del 1 al 10, ¿qué dirías?',
  },
  aroma: {
    title: 'Aroma',
    body: 'La fragancia que percibes con la nariz, tanto del café recién servido como mientras lo bebes.',
    howTo: 'Antes del primer sorbo, acerca la nariz a la taza e inhala. ¿Recuerda a flores, frutas, chocolate, especias? Cuanto más complejo y agradable, mayor puntaje.',
  },
  acidity: {
    title: 'Acidez',
    body: 'No es agrio como un limón directo: es esa sensación viva, brillante, que despierta la lengua. Es una cualidad deseada en cafés de especialidad.',
    howTo: 'Sentirás un cosquilleo en los costados de la lengua, parecido a morder una manzana verde o sorber jugo de naranja. Si la taza se siente "plana", la acidez es baja.',
  },
  sweetness: {
    title: 'Dulzura',
    body: 'Cuán natural y persistente se siente el dulzor del café, sin necesidad de azúcar añadida. Viene del grano bien madurado y bien procesado.',
    howTo: 'Busca sabores que recuerden a panela, miel, caramelo, fruta madura o chocolate. Si necesitas endulzarlo para que sepa bien, la dulzura natural es baja.',
  },
  body: {
    title: 'Cuerpo',
    body: 'La sensación física del café en la boca: su peso, textura y densidad. No tiene que ver con el sabor sino con cómo lo percibes al tacto.',
    howTo: 'Compáralo con un líquido conocido. ¿Es ligero como té o agua? ¿Sedoso como leche? ¿Cremoso o denso como un jarabe? Más cuerpo = se siente más "presente" en la boca.',
  },
  aftertaste: {
    title: 'Retrogusto',
    body: 'Lo que queda en la boca después de tragar. Un buen retrogusto persiste con sabores agradables; uno malo se desvanece rápido o deja sensaciones secas o amargas.',
    howTo: 'Traga y espera 10 segundos. ¿Sigues notando sabores? ¿Son los mismos que tenías al sorber, o cambian a algo desagradable? Cuanto más largo y limpio, mejor.',
  },
} as const

// Kept for backwards compatibility (used only where catalog isn't available)
export const PROCESS_OPTIONS = [
  { value: 'washed', label: 'Lavado' },
  { value: 'natural', label: 'Natural' },
  { value: 'honey', label: 'Honey' },
  { value: 'anaerobic', label: 'Anaeróbico' },
  { value: 'carbonic', label: 'Maceración Carbónica' },
  { value: 'experimental', label: 'Experimental' },
  { value: 'other', label: 'Otro' },
]

export const ROAST_LEVEL_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'medium_light', label: 'Medio-Claro' },
  { value: 'medium', label: 'Medio' },
  { value: 'medium_dark', label: 'Medio-Oscuro' },
  { value: 'dark', label: 'Oscuro' },
]

export const BREW_METHOD_OPTIONS = [
  { value: 'v60', label: 'V60' },
  { value: 'kalita', label: 'Kalita' },
  { value: 'chemex', label: 'Chemex' },
  { value: 'aeropress', label: 'AeroPress' },
  { value: 'french_press', label: 'Prensa Francesa' },
  { value: 'origami', label: 'Origami' },
  { value: 'suiren', label: 'Suiren' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'moka_pot', label: 'Moka' },
  { value: 'phin', label: 'Phin (Vietnamita)' },
  { value: 'cold_brew', label: 'Cold Brew' },
  { value: 'other', label: 'Otro' },
]

export const COLOMBIAN_REGIONS = [
  'Huila',
  'Nariño',
  'Antioquia',
  'Tolima',
  'Cundinamarca',
  'Cauca',
  'Santander',
  'Sierra Nevada',
  'Quindío',
  'Risaralda',
  'Caldas',
  'Valle del Cauca',
  'Putumayo',
  'Casanare',
]

export const COMMON_VARIETIES = [
  'Caturra',
  'Castillo',
  'Colombia',
  'Typica',
  'Bourbon',
  'Gesha',
  'Pacamara',
  'Java',
  'Tabí',
  'Cenicafé 1',
  'Pink Bourbon',
  'Wush Wush',
  'Sidra',
  'Sudan Rume',
  'Eugenioides',
  'SL28',
  'SL34',
  'Maragogipe',
  'Laurina',
]

export const RARITY_OPTIONS = [
  { value: 'common', label: 'Común', color: 'gray' },
  { value: 'uncommon', label: 'Poco común', color: 'green' },
  { value: 'rare', label: 'Raro', color: 'blue' },
  { value: 'very_rare', label: 'Muy raro', color: 'purple' },
]

export const PRIORITY_OPTIONS = [
  { value: 1, label: 'Baja' },
  { value: 2, label: 'Normal' },
  { value: 3, label: 'Media' },
  { value: 4, label: 'Alta' },
  { value: 5, label: 'Urgente' },
]

export const WISHLIST_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'yellow' },
  { value: 'purchased', label: 'Comprado', color: 'green' },
  { value: 'unavailable', label: 'No disponible', color: 'gray' },
]

/**
 * Descripción corta por método de extracción — usada en los wizards de cata
 * y receta para explicar cada opción a usuarios sin background barista.
 * Una línea, sin jerga, con el rasgo dominante (cuerpo/velocidad/estilo).
 */
export const BREW_METHOD_DESCRIPTION: Record<string, string> = {
  v60: 'Pour-over cónico, cuerpo limpio y notas claras',
  chemex: 'Filtro grueso, taza dulce y transparente',
  kalita: 'Fondo plano, extracción pareja',
  origami: 'Cónico versátil, sensible al papel',
  suiren: 'Elegante y contemplativo, extracción lenta',
  aeropress: 'Presión + inmersión, rápido y cuerpo medio',
  french_press: 'Inmersión total, cuerpo pleno con aceites',
  espresso: 'Presión 9 bar, concentrado e intenso',
  moka_pot: 'Estufa italiana, fuerte y nostálgico',
  phin: 'Filtro vietnamita, denso y dulce',
  cold_brew: 'Frío 12h, dulce y baja acidez',
  other: 'Tu método, tus reglas',
}
