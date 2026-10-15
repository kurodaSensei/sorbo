<script setup lang="ts">
import { cn } from '~/lib/utils'

export interface SidebarItem {
  key: string
  label: string
  to: string
}

export interface SidebarSection {
  title: string
  items: SidebarItem[]
}

defineProps<{
  sections: SidebarSection[]
  user?: { name: string; photoURL?: string | null } | null
  class?: string
}>()

const route = useRoute()

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <aside
    :class="
      cn(
        'sticky top-0 flex h-svh w-[260px] xl:w-[280px] flex-col gap-xl bg-paper',
        'border-r border-moss/10 px-lg py-lg',
        $props.class,
      )
    "
  >
    <div class="flex items-center justify-between gap-sm">
      <NuxtLink to="/app" class="inline-flex items-center gap-sm" aria-label="Sorbo · Inicio">
        <img src="/sorbo.svg" alt="" aria-hidden="true" class="block size-[36px] shrink-0">
        <span class="font-display text-[28px] leading-none text-moss">
          Sorbo<span class="text-honey">.</span>
        </span>
      </NuxtLink>
      <UiNotificationBell size="md" />
    </div>

    <nav class="flex-1 flex flex-col gap-lg overflow-y-auto" aria-label="Navegación principal">
      <div v-for="section in sections" :key="section.title" class="flex flex-col gap-xs">
        <UiEyebrow class="px-sm">
          {{ section.title }}
        </UiEyebrow>
        <ul class="flex flex-col gap-xxs">
          <li v-for="item in section.items" :key="item.key">
            <NuxtLink
              :to="item.to"
              :aria-current="isActive(item.to) ? 'page' : undefined"
              :class="
                cn(
                  'flex items-center gap-sm px-sm py-[10px] rounded-cta font-sans text-label transition-colors duration-150 ease-sorbo',
                  isActive(item.to)
                    ? 'text-olive font-medium'
                    : 'text-moss-soft hover:bg-surface-2/60 hover:text-moss',
                )
              "
            >
              <span
                aria-hidden="true"
                :class="
                  cn(
                    'inline-block size-[6px] rounded-pill transition-colors duration-150',
                    isActive(item.to) ? 'bg-olive' : 'bg-transparent',
                  )
                "
              />
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </div>
    </nav>

    <NuxtLink
      v-if="user"
      to="/app/settings"
      class="flex items-center gap-sm rounded-card-sm p-xs -m-xs hover:bg-surface-2/60 transition-colors duration-150 ease-sorbo"
    >
      <UiAvatar :name="user.name" :src="user.photoURL ?? undefined" size="sm" />
      <div class="flex flex-col leading-tight gap-[2px] min-w-0">
        <span class="font-sans text-label text-moss truncate">{{ user.name }}</span>
        <UiEyebrow>Perfil</UiEyebrow>
      </div>
    </NuxtLink>
  </aside>
</template>
