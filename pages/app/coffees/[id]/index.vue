<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, CoffeeProcess, RoastLevel, Tasting, Visibility } from '~/types'

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const coffeesStore = useCoffeesStore()
const tastingsStore = useTastingsStore()
const wishlistStore = useWishlistStore()

const id = computed(() => route.params.id as string)
const coffee = ref<Coffee | null>(null)
const loading = ref(true)
const notFound = ref(false)

// Solo el dueño puede editar/eliminar/compartir. Un café de comunidad ajeno
// es de solo lectura.
const isOwner = computed(() => !!coffee.value && coffee.value.userId === userId.value)

onMounted(async () => {
  try {
    await coffeesStore.loadById(id.value)
    coffee.value = coffeesStore.current as Coffee | null
    if (!coffee.value) {
      notFound.value = true
    }
    tastingsStore.loadAll().catch(() => {})
    // La wishlist alimenta el estado del botón "A mi wishlist" para visitantes.
    if (wishlistStore.list.length === 0) wishlistStore.loadAll().catch(() => {})
  }
  catch {
    notFound.value = true
  }
  finally {
    loading.value = false
  }
})

const processLabel: Record<CoffeeProcess, string> = {
  washed: 'Lavado',
  natural: 'Natural',
  honey: 'Honey',
  anaerobic: 'Anaeróbico',
  carbonic: 'Carbónico',
  experimental: 'Experimental',
  other: 'Otro',
}

const roastLabel: Record<RoastLevel, string> = {
  light: 'Claro',
  medium_light: 'Medio claro',
  medium: 'Medio',
  medium_dark: 'Medio oscuro',
  dark: 'Oscuro',
}

const purchaseChannelLabel: Record<string, string> = {
  website: 'Web',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  shop: 'Tienda',
  other: 'Otro',
}

const purchaseInfo = computed(() => {
  const c = coffee.value
  if (!c) return ''
  const channel = c.purchaseChannel ? purchaseChannelLabel[c.purchaseChannel] || '' : ''
  const ref = c.purchaseReference || ''
  if (channel && ref) return `${channel} · ${ref}`
  return channel || ref
})

const eyebrow = computed(() => {
  if (!coffee.value) return ''
  const parts = [
    coffee.value.process ? processLabel[coffee.value.process] : '',
    coffee.value.originRegion,
    coffee.value.variety,
  ].filter(Boolean)
  return parts.join(' · ')
})

const tagline = computed(() => {
  const notes = coffee.value?.flavorNotes || []
  if (notes.length === 0) return ''
  if (notes.length === 1) return `${notes[0]}.`
  if (notes.length === 2) return `${notes[0]} y ${notes[1]}.`
  return `${notes.slice(0, -1).join(', ')} y ${notes[notes.length - 1]}.`
})

const pricePerGram = computed(() => {
  const c = coffee.value
  if (!c?.price || !c?.weight) return null
  const value = c.price / c.weight
  return value >= 100 ? Math.round(value) : Math.round(value * 10) / 10
})

const coffeeTastings = computed<Tasting[]>(() => {
  const list = (tastingsStore.list as Tasting[]) || []
  return list.filter(t => t.coffeeId === id.value)
})

const tastingsCount = computed(() => coffeeTastings.value.length)

const lastTastingScore = computed(() => {
  const list = coffeeTastings.value
  if (list.length === 0) return null
  const sorted = [...list].sort((a, b) => {
    const ta = a.brewDate?.toMillis?.() ?? 0
    const tb = b.brewDate?.toMillis?.() ?? 0
    return tb - ta
  })
  return sorted[0].ratingOverall ?? null
})

const currentYear = new Date().getFullYear()

function formatPrice(p?: number): string {
  if (!p) return '—'
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p)
}

function onEdit() {
  if (!coffee.value) return
  router.push(`/app/coffees/${coffee.value.id}/edit`)
}

const shareOpen = ref(false)

function onShare() {
  if (!coffee.value) return
  shareOpen.value = true
}

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (coffee.value) coffee.value = { ...coffee.value, visibility, sharedWith: uids }
}

// ── Acciones para visitantes (no-owners) ─────────────────────────────────────
const inWishlist = computed(() =>
  !!coffee.value && !!wishlistStore.findMatchingItem(coffee.value),
)

const savingToWishlist = ref(false)
async function onSaveToWishlist() {
  if (!coffee.value || savingToWishlist.value) return
  savingToWishlist.value = true
  try {
    await wishlistStore.addFromCoffee(coffee.value)
  }
  finally {
    savingToWishlist.value = false
  }
}

const duplicating = ref(false)
async function onDuplicate() {
  if (!coffee.value || duplicating.value) return
  duplicating.value = true
  try {
    const newId = await coffeesStore.duplicate(coffee.value)
    if (newId) router.push(`/app/coffees/${newId}`)
  }
  finally {
    duplicating.value = false
  }
}

const deleting = ref(false)
const { confirm } = useConfirm()

async function onDelete() {
  if (!coffee.value || deleting.value) return
  const ok = await confirm({
    title: `Eliminar "${coffee.value.name}"`,
    message: 'Esta acción no se puede deshacer.',
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await coffeesStore.remove(coffee.value.id)
    router.replace('/app/coffees')
  }
  catch {
    // Toast surfaced by store
  }
  finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="relative min-h-svh flex flex-col">
    <!-- Top header -->
    <header class="sticky top-0 z-10 bg-paper/95 backdrop-blur-md border-b border-moss/5">
      <div class="mx-auto w-full max-w-[1200px] flex items-center justify-between gap-md px-md py-sm lg:px-xl xl:px-2xl">
        <button
          type="button"
          class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
          aria-label="Volver"
          @click="router.back()"
        >
          <Icon name="lucide:arrow-left" class="size-5" />
        </button>
        <UiEyebrow class="truncate text-center flex-1">
          {{ coffee?.roasterName || 'Café' }}
        </UiEyebrow>
        <UiActionMenu v-if="coffee && isOwner" aria-label="Más acciones">
          <UiActionMenuItem icon="lucide:share-2" @click="onShare">
            Compartir
          </UiActionMenuItem>
          <UiActionMenuItem icon="lucide:pencil" @click="onEdit">
            Editar
          </UiActionMenuItem>
          <UiActionMenuItem destructive icon="lucide:trash-2" @click="onDelete">
            Eliminar
          </UiActionMenuItem>
        </UiActionMenu>
        <div v-else class="size-[44px]" aria-hidden="true" />
      </div>
    </header>

    <main class="flex-1 mx-auto w-full max-w-[1200px] px-md pt-lg pb-[180px] lg:px-xl xl:px-2xl lg:pt-xl lg:pb-2xl">
      <!-- Loading -->
      <div v-if="loading" class="flex justify-center py-2xl">
        <span class="size-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
      </div>

      <!-- Not found -->
      <div v-else-if="notFound" class="flex flex-col items-center gap-lg py-2xl">
        <p class="font-display italic text-moss-soft text-center">
          No encontramos este café.
        </p>
        <UiButton variant="dark" :block="false" to="/app/coffees">
          Volver a mi colección
        </UiButton>
      </div>

      <!-- Detail -->
      <template v-else-if="coffee">
        <UiEyebrow>{{ eyebrow }}</UiEyebrow>

        <h1 class="mt-md font-display tracking-[-0.02em] leading-[0.95] text-moss text-[64px] sm:text-[72px] lg:text-[96px]">
          {{ coffee.name.endsWith('.') ? coffee.name.slice(0, -1) : coffee.name }}
        </h1>

        <p v-if="tagline" class="mt-md font-display italic text-[14px] lg:text-[16px] text-moss-soft max-w-prose">
          {{ tagline }}
        </p>

        <!-- Score block -->
        <div v-if="coffee.scaScore" class="mt-2xl flex items-end justify-between gap-md border-b border-moss/10 pb-lg">
          <div class="flex items-baseline gap-xxs">
            <span class="font-display text-[80px] leading-none text-olive">
              {{ Math.floor(coffee.scaScore) }}
            </span>
            <span class="font-display text-[40px] leading-none text-olive">
              .{{ ((coffee.scaScore % 1).toFixed(1)).slice(2) || '0' }}
            </span>
          </div>
          <div class="flex flex-col gap-xxs items-end text-right">
            <UiEyebrow>Puntaje</UiEyebrow>
            <UiEyebrow>SCA · {{ currentYear }}</UiEyebrow>
          </div>
        </div>

        <!-- Notas en taza -->
        <section v-if="(coffee.flavorNotes || []).length > 0" class="mt-xl">
          <UiEyebrow>Notas en taza</UiEyebrow>
          <div class="mt-sm flex flex-wrap gap-xxs">
            <UiChip v-for="n in coffee.flavorNotes" :key="n" variant="active">
              {{ n }}
            </UiChip>
          </div>
        </section>

        <!-- Specs -->
        <section class="mt-xl">
          <UiSpecRow v-if="coffee.originRegion || coffee.originCountry" label="Origen">
            {{ [coffee.originRegion, coffee.originCountry].filter(Boolean).join(', ') }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.altitude" label="Altitud">
            {{ coffee.altitude.toLocaleString('es-CO') }} msnm
          </UiSpecRow>
          <UiSpecRow v-if="coffee.roastLevel" label="Tueste">
            {{ roastLabel[coffee.roastLevel] }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.originFarm" label="Finca">
            {{ coffee.originFarm }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.originProducer" label="Productor">
            {{ coffee.originProducer }}
          </UiSpecRow>
          <UiSpecRow v-if="pricePerGram !== null" label="Precio / g" :bare="!coffee.price">
            ${{ pricePerGram }} / g
          </UiSpecRow>
          <UiSpecRow v-if="coffee.price" label="Precio total" :bare="!coffee.weight">
            {{ formatPrice(coffee.price) }}
          </UiSpecRow>
          <UiSpecRow v-if="coffee.weight" label="Peso" bare>
            {{ coffee.weight }} g
          </UiSpecRow>
          <UiSpecRow v-if="purchaseInfo" label="Comprado en">
            {{ purchaseInfo }}
          </UiSpecRow>
        </section>
      </template>
    </main>

    <!-- Sticky CTA — solo para el dueño; un café de comunidad ajeno es de
         solo lectura. Sits above the mobile TabBar (~56px + safe-area). -->
    <div
      v-if="coffee && !loading && !notFound && isOwner"
      class="fixed inset-x-0 z-20 px-md pt-sm pb-sm lg:px-xl xl:px-2xl bottom-[calc(56px+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[calc(env(safe-area-inset-bottom)+12px)]"
    >
      <div class="mx-auto w-full max-w-[1200px]">
        <NuxtLink
          :to="`/app/tastings/new?coffeeId=${coffee.id}`"
          class="group flex items-center justify-between gap-md rounded-card-lg bg-jungle text-paper p-md sm:p-lg transition-transform duration-200 ease-sorbo hover:-translate-y-[2px]"
        >
          <div class="flex flex-col gap-xs min-w-0">
            <UiEyebrow class="text-paper/60">
              <template v-if="tastingsCount > 0">
                {{ tastingsCount }} {{ tastingsCount === 1 ? 'cata' : 'catas' }}
                <template v-if="lastTastingScore !== null"> · última {{ lastTastingScore }}</template>
              </template>
              <template v-else>
                Aún sin catas
              </template>
            </UiEyebrow>
            <span class="font-display text-[24px] leading-none">Cata este café</span>
          </div>
          <span
            aria-hidden="true"
            class="flex shrink-0 items-center justify-center rounded-pill bg-honey text-jungle size-[44px] sm:size-[48px] transition-transform duration-200 ease-sorbo group-hover:translate-x-[2px]"
          >
            <Icon name="lucide:plus" class="size-5" />
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Sticky CTA para visitantes (cafés de comunidad ajenos). Replica las
         acciones disponibles desde Explora: guardar a wishlist + duplicar. -->
    <div
      v-if="coffee && !loading && !notFound && !isOwner"
      class="fixed inset-x-0 z-20 px-md pt-sm pb-sm lg:px-xl xl:px-2xl bottom-[calc(56px+env(safe-area-inset-bottom))] lg:bottom-0 lg:pb-[calc(env(safe-area-inset-bottom)+12px)] bg-paper/95 backdrop-blur-md border-t border-moss/5"
    >
      <div class="mx-auto w-full max-w-[1200px] flex gap-xs">
        <UiButton
          variant="ghost"
          :block="true"
          :loading="savingToWishlist"
          @click="onSaveToWishlist"
        >
          <Icon
            :name="inWishlist ? 'lucide:bookmark-check' : 'lucide:bookmark'"
            class="size-4"
            aria-hidden="true"
          />
          {{ inWishlist ? 'En tu wishlist' : 'A mi wishlist' }}
        </UiButton>
        <UiButton
          variant="dark"
          :block="true"
          :loading="duplicating"
          @click="onDuplicate"
        >
          <Icon name="lucide:plus" class="size-4" aria-hidden="true" />
          A mi colección
        </UiButton>
      </div>
    </div>

    <UiShareSheet
      v-if="coffee"
      v-model="shareOpen"
      :entity-name="coffee.name"
      entity-kind="coffee"
      :initial-visibility="coffee.visibility ?? 'private'"
      :initial-shared-with="coffee.sharedWith ?? []"
      :on-save="(visibility, uids) => coffeesStore.updateVisibility(coffee!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>
</template>
