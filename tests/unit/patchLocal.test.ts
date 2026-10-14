import { describe, it, expect } from 'vitest'
import { deleteField } from 'firebase/firestore'
import { patchLocal } from '~/stores/factory'

describe('patchLocal', () => {
  it('aplica cambios y deleteField() quita la clave en vez de guardarse', () => {
    const out = patchLocal({ id: 'a', notes: 'x', dose: 18 } as any, { notes: deleteField(), dose: 20 } as any)
    expect(out).toEqual({ id: 'a', dose: 20 })
    expect('notes' in out).toBe(false)
  })
})
