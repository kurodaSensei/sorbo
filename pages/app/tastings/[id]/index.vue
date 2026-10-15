<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { Coffee, Tasting, Visibility } from '~/types'

const route = useRoute()
const router = useRouter()
const { userId } = useAuth()
const tastingsStore = useTastingsStore()
const coffeesStore = useCoffeesStore()

const id = computed(() => route.params.id as string)
const tasting = ref<Tasting | null>(null)
const coffee = ref<Coffee | null>(null)
const loading = ref(true)
const notFound = ref(false)

// Solo el dueño edita/elimina/comparte; una cata de comunidad ajena es de
// solo lectura.
const isOwner = computed(() => !!tasting.value && tasting.value.userId === userId.value)

onMounted(async () => {
  try {
    await tastingsStore.loadById(id.value)
    tasting.value = tastingsStore.current as Tasting | null
    if (!tasting.value) {
      notFound.value = true
      return
    }
    if (!coffeesStore.list.length) await coffeesStore.loadAll().catch(() => {})
    coffee.value = (coffeesStore.list as Coffee[]).find(c => c.id === tasting.value!.coffeeId) ?? null
  }
  catch {
    notFound.value = true
  }
  finally {
    loading.value = false
  }
})

const shareOpen = ref(false)

function onShare() {
  if (!tasting.value) return
  shareOpen.value = true
}

function onShareSaved(visibility: Visibility, uids: string[]) {
  if (tasting.value) tasting.value = { ...tasting.value, visibility, sharedWith: uids }
}

const deleting = ref(false)

async function onEdit() {
  if (!tasting.value) return
  router.push(`/app/tastings/${tasting.value.id}/edit`)
}

const { confirm } = useConfirm()

async function onDelete() {
  if (!tasting.value || deleting.value) return
  const ok = await confirm({
    title: 'Eliminar cata',
    message: `Esta cata de "${tasting.value.coffeeName}" se borrará. No se puede deshacer.`,
    confirmLabel: 'Eliminar',
    destructive: true,
  })
  if (!ok) return
  deleting.value = true
  try {
    await tastingsStore.remove(tasting.value.id)
    router.replace('/app/tastings')
  }
  catch {
    // toast already surfaced
  }
  finally {
    deleting.value = false
  }
}

async function toggleFavorite() {
  if (!tasting.value) return
  const next = !tasting.value.isFavorite
  try {
    await tastingsStore.update(tasting.value.id, { isFavorite: next })
    tasting.value = { ...tasting.value, isFavorite: next }
  }
  catch {
    // toast surfaced
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-[1200px] px-md pt-md pb-2xl lg:px-xl xl:px-2xl lg:pt-xl">
    <header class="flex items-center justify-between gap-md">
      <button
        type="button"
        class="inline-flex items-center justify-center size-[44px] rounded-pill text-moss hover:bg-surface-2/60 transition-colors"
        aria-label="Volver"
        @click="router.back()"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <UiEyebrow>Cata</UiEyebrow>
      <UiActionMenu v-if="tasting && isOwner" aria-label="Más acciones">
        <UiActionMenuItem :icon="tasting.isFavorite ? 'lucide:heart-off' : 'lucide:heart'" @click="toggleFavorite">
          {{ tasting.isFavorite ? 'Quitar favorito' : 'Marcar favorito' }}
        </UiActionMenuItem>
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
    </header>

    <div class="mt-lg max-w-[640px] mx-auto">
      <div v-if="loading" class="flex justify-center py-2xl">
        <span class="size-6 animate-spin rounded-full border-2 border-moss/20 border-t-moss" />
      </div>

      <div v-else-if="notFound" class="flex flex-col items-center gap-lg py-2xl">
        <p class="font-display italic text-moss-soft text-center">
          No encontramos esta cata.
        </p>
        <UiButton variant="dark" :block="false" to="/app/tastings">
          Volver a mis catas
        </UiButton>
      </div>

      <TastingDetail v-else-if="tasting" :tasting="tasting" :coffee="coffee" />

      <!-- Related actions — cierra el "acabo de ver esta cata, ¿ahora
           qué?". Repetir la cata (prefill coffeeId) o saltar al detalle
           del café. Solo cuando el usuario es dueño (visitantes usan la
           navegación externa). -->
      <section
        v-if="tasting && !loading && !notFound && isOwner"
        class="mt-2xl border-t border-moss/10 pt-lg"
      >
        <UiEyebrow>Siguiente</UiEyebrow>
        <div class="mt-sm grid grid-cols-1 sm:grid-cols-2 gap-sm">
          <UiQuickCard
            eyebrow="Acelerador"
            label="Repetir esta cata"
            hint="Nueva cata del mismo café"
            :to="`/app/tastings/new?coffeeId=${tasting.coffeeId}`"
          />
          <UiQuickCard
            v-if="coffee"
            eyebrow="Contexto"
            label="Ver este café"
            hint="Detalle + histórico"
            :to="`/app/coffees/${coffee.id}`"
          />
        </div>
      </section>
    </div>

    <UiShareSheet
      v-if="tasting"
      v-model="shareOpen"
      :entity-name="`cata de ${tasting.coffeeName}`"
      entity-kind="tasting"
      :initial-visibility="tasting.visibility ?? 'private'"
      :initial-shared-with="tasting.sharedWith ?? []"
      :on-save="(visibility, uids) => tastingsStore.updateVisibility(tasting!.id, visibility, uids)"
      @saved="onShareSaved"
    />
  </div>
</template>
