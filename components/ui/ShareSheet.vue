<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import type { Visibility } from '~/types'

const props = defineProps<{
  modelValue: boolean
  /** Nombre del item (para el subtítulo). */
  entityName?: string
  /** Tipo del item — usado para etiquetar el evento de analytics. */
  entityKind?: 'coffee' | 'tasting' | 'recipe'
  initialVisibility?: Visibility
  initialSharedWith?: string[]
  /** Persiste la nueva visibilidad. */
  onSave: (visibility: Visibility, sharedWith: string[]) => Promise<void>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [visibility: Visibility, sharedWith: string[]]
}>()

const friendsStore = useFriendsStore()
const { confirm } = useConfirm()
const { trackEvent } = useAnalytics()

// Aviso de privacidad mostrado una sola vez por dispositivo.
const communityWarned = useLocalStorage<boolean>('sorbo:community-warned', false)

onMounted(() => {
  if (friendsStore.list.length === 0) friendsStore.load().catch(() => {})
})

const visibility = ref<Visibility>('private')
const selectedUids = ref<string[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      visibility.value = props.initialVisibility ?? 'private'
      selectedUids.value = [...(props.initialSharedWith ?? [])]
    }
  },
  { immediate: true },
)

interface FriendEntry { uid: string; label: string }

const friends = computed<FriendEntry[]>(() => {
  return friendsStore.accepted
    .map((f) => {
      const other = friendsStore.getOtherUser(f)
      if (!other) return null
      return { uid: other.uid, label: other.displayName || other.email }
    })
    .filter((x): x is FriendEntry => x !== null)
})

const OPTIONS: { value: Visibility; icon: string; title: string; desc: string }[] = [
  { value: 'private', icon: 'lucide:lock', title: 'Privado', desc: 'Solo tú lo ves' },
  { value: 'friends', icon: 'lucide:users', title: 'Amigos', desc: 'Los amigos que elijas' },
  { value: 'community', icon: 'lucide:globe', title: 'Comunidad', desc: 'Todos en Sorbo, en Explora' },
]

function toggleFriend(uid: string) {
  const idx = selectedUids.value.indexOf(uid)
  if (idx === -1) selectedUids.value.push(uid)
  else selectedUids.value.splice(idx, 1)
}

const saving = ref(false)

const hasChanges = computed(() => {
  if (visibility.value !== (props.initialVisibility ?? 'private')) return true
  if (visibility.value === 'friends') {
    const before = [...(props.initialSharedWith ?? [])].sort().join(',')
    const after = [...selectedUids.value].sort().join(',')
    return before !== after
  }
  return false
})

async function save() {
  if (saving.value) return

  // Aviso de privacidad la primera vez que algo se hace público.
  if (visibility.value === 'community' && !communityWarned.value) {
    const ok = await confirm({
      title: 'Compartir con la comunidad',
      message: 'Será visible para todos los usuarios de Sorbo en Explora. Tu nombre y avatar aparecerán como autor.',
      confirmLabel: 'Entiendo, compartir',
    })
    if (!ok) return
    communityWarned.value = true
  }

  saving.value = true
  try {
    const uids = visibility.value === 'friends' ? selectedUids.value.slice() : []
    await props.onSave(visibility.value, uids)
    trackEvent('visibility_changed', {
      entity: props.entityKind || 'unknown',
      visibility: visibility.value,
      friends_count: uids.length,
    })
    emit('saved', visibility.value, uids)
    emit('update:modelValue', false)
  }
  catch {
    // toast surfaced by caller
  }
  finally {
    saving.value = false
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <UiBottomSheet
    :model-value="modelValue"
    title="Compartir"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-lg pt-xs">
      <p v-if="entityName" class="subtitle-italic">
        Decide quién puede ver "{{ entityName }}".
      </p>

      <!-- Selector de visibilidad -->
      <div class="flex flex-col gap-xs">
        <button
          v-for="opt in OPTIONS"
          :key="opt.value"
          type="button"
          class="flex items-center gap-md rounded-card-sm border p-md text-left transition-colors duration-150 ease-sorbo"
          :class="
            visibility === opt.value
              ? 'border-olive bg-olive/5'
              : 'border-moss/10 hover:bg-surface-2/50'
          "
          @click="visibility = opt.value"
        >
          <Icon
            :name="opt.icon"
            class="size-5 shrink-0"
            :class="visibility === opt.value ? 'text-olive' : 'text-moss-soft'"
            aria-hidden="true"
          />
          <div class="flex-1 min-w-0">
            <div class="font-sans text-[15px] font-medium text-moss">{{ opt.title }}</div>
            <div class="font-sans text-[12px] text-moss-soft">{{ opt.desc }}</div>
          </div>
          <span
            v-if="visibility === opt.value"
            aria-hidden="true"
            class="inline-flex items-center justify-center size-[20px] rounded-pill bg-olive text-paper shrink-0"
          >
            <Icon name="lucide:check" class="size-[12px]" />
          </span>
        </button>
      </div>

      <!-- Amigos: lista de chips -->
      <div v-if="visibility === 'friends'" class="flex flex-col gap-xs">
        <UiEyebrow>Elige amigos · {{ selectedUids.length }}</UiEyebrow>
        <div v-if="friends.length > 0" class="flex flex-wrap gap-xxs">
          <UiChip
            v-for="f in friends"
            :key="f.uid"
            interactive
            :variant="selectedUids.includes(f.uid) ? 'active' : 'default'"
            @click="toggleFriend(f.uid)"
          >
            {{ f.label }}
          </UiChip>
        </div>
        <div v-else class="rounded-card bg-surface px-md py-md text-center">
          <p class="font-display italic text-[14px] text-moss-soft leading-relaxed">
            Aún no tienes amigos en Sorbo.
          </p>
          <UiButton
            variant="dark"
            :block="false"
            size="sm"
            to="/app/friends"
            class="mt-sm"
            @click="close"
          >
            Agregar amigos
          </UiButton>
        </div>
      </div>

      <!-- Comunidad: aviso -->
      <div
        v-else-if="visibility === 'community'"
        class="rounded-card-sm bg-surface-2 p-md flex gap-sm"
      >
        <Icon name="lucide:info" class="size-4 text-moss-soft shrink-0 mt-[2px]" aria-hidden="true" />
        <p class="font-display italic text-[13px] text-moss-soft leading-relaxed">
          Aparecerá en Explora para toda la comunidad de Sorbo, con tu nombre y avatar como autor.
        </p>
      </div>

      <UiButton
        variant="dark"
        :loading="saving"
        :disabled="!hasChanges"
        @click="save"
      >
        Guardar
      </UiButton>
    </div>
  </UiBottomSheet>
</template>
