import { describe, expect, it } from 'vitest'
import { shareContent } from '../../utils/share'

const labels = { process: (v: string) => ({ natural: 'Natural' } as Record<string, string>)[v] || v, method: (v: string) => ({ v60: 'V60' } as Record<string, string>)[v] || v }
const ts = (iso: string) => ({ toMillis: () => new Date(iso).getTime() })

describe('imagen para compartir', () => {
  it('café: solo los datos que existen, sin repetir el proceso', () => {
    const c = shareContent('cafe', { name: 'Red Honey.', roasterName: 'Rayo Café', process: 'natural', originRegion: 'Huila', originCountry: 'Colombia', variety: '', flavorNotes: ['a', 'b', 'c', 'd', 'e'], scaScore: 86 } as never, { format: 'historia', includeNote: true, labels })
    expect(c.eyebrow).toBe('Natural · Huila, Colombia')
    expect(c.name).toBe('Red Honey')
    expect(c.chips).toHaveLength(4)
    expect(c.rows).toEqual([['Puntaje SCA', '86']])
  })

  it('cata: puntaje con palabra y la nota se puede quitar', () => {
    const t = { coffeeName: 'Lomaverde', roasterName: 'Pergamino', ratingOverall: 8, personalNotes: 'Dulce. Final largo.', brewMethod: 'v60', dose: 15, ratio: '1:16', brewDate: ts('2026-05-14T12:00:00') }
    const story = shareContent('cata', t as never, { format: 'historia', includeNote: true, labels })
    expect([story.score, story.word, story.quote, story.meta]).toEqual([4, 'Muy rico', 'Dulce. Final largo', 'V60 · 15 g · 1:16'])
    expect(shareContent('cata', t as never, { format: 'publicacion', includeNote: true, labels }).quote).toBe('Dulce')
    expect(shareContent('cata', t as never, { format: 'historia', includeNote: false, labels }).quote).toBe('')
  })

  it('receta: tiempo total del último paso y la publicación lleva 4 cifras sin pasos', () => {
    const r = { name: 'La V60', brewMethod: 'v60', author: 'Desconocido', dose: 15, water: 250, waterTemp: 94, grindSize: 'medium', steps: [{ timeSeconds: 45, title: 'B' }, { timeSeconds: 0, title: 'A' }] }
    const story = shareContent('receta', r as never, { format: 'historia', includeNote: true, labels })
    expect(story.eyebrow).toBe('V60')
    expect(story.tiles.find(t => t[0] === 'Tiempo')).toEqual(['Tiempo', '0:45'])
    expect(story.steps[0]).toEqual(['0:00', 'A'])
    const post = shareContent('receta', r as never, { format: 'publicacion', includeNote: true, labels })
    expect([post.tiles.length, post.steps.length]).toEqual([4, 0])
  })
})
