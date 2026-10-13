import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, deleteField, getDocs, collection, query, where,
} from 'firebase/firestore'

let env: RulesTestEnvironment
const OWNER = 'owner', FRIEND = 'friend', STRANGER = 'stranger'
const db = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore())
const seed = (path: string, data: any) => env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), path), data) })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'sorbo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

// Colecciones con dueño: crear/leer/actualizar/borrar solo el dueño.
describe.each(['roasters', 'wishlist'])('%s (solo dueño)', (col) => {
  const mine = { userId: OWNER, name: 'x' }
  it('dueño: CRUD completo', async () => {
    const d = doc(db(OWNER), `${col}/a`)
    await assertSucceeds(setDoc(d, mine))
    await assertSucceeds(getDoc(d))
    await assertSucceeds(updateDoc(d, { name: 'y' }))
    await assertSucceeds(deleteDoc(d))
  })
  it('crear con userId ajeno o sin sesión falla', async () => {
    await assertFails(setDoc(doc(db(STRANGER), `${col}/a`), mine))
    await assertFails(setDoc(doc(db(null), `${col}/a`), mine))
  })
  it('otro usuario no lee, edita ni borra', async () => {
    await seed(`${col}/a`, mine)
    const d = doc(db(STRANGER), `${col}/a`)
    await assertFails(getDoc(d)); await assertFails(updateDoc(d, { name: 'z' })); await assertFails(deleteDoc(d))
  })
  it('incluso con visibility community / sharedWith sigue privado', async () => {
    await seed(`${col}/a`, { ...mine, visibility: 'community', sharedWith: [FRIEND] })
    await assertFails(getDoc(doc(db(FRIEND), `${col}/a`)))
  })
})

describe.each(['coffees', 'tastings', 'recipes'])('%s (compartibles)', (col) => {
  const base = { userId: OWNER, name: 'x' }
  it('dueño: CRUD completo', async () => {
    const d = doc(db(OWNER), `${col}/a`)
    await assertSucceeds(setDoc(d, base))
    await assertSucceeds(getDoc(d))
    await assertSucceeds(updateDoc(d, { name: 'y' }))
    await assertSucceeds(deleteDoc(d))
  })
  it('crear exige userId == auth.uid', async () => {
    await assertFails(setDoc(doc(db(STRANGER), `${col}/a`), base))
    await assertFails(setDoc(doc(db(null), `${col}/a`), base))
    await assertSucceeds(setDoc(doc(db(STRANGER), `${col}/b`), { ...base, userId: STRANGER }))
  })
  it('privado: otro no lee', async () => {
    await seed(`${col}/a`, { ...base, visibility: 'private', sharedWith: [] })
    await assertFails(getDoc(doc(db(STRANGER), `${col}/a`)))
  })
  it('friends: lee quien está en sharedWith, no otro', async () => {
    await seed(`${col}/a`, { ...base, visibility: 'friends', sharedWith: [FRIEND] })
    await assertSucceeds(getDoc(doc(db(FRIEND), `${col}/a`)))
    await assertFails(getDoc(doc(db(STRANGER), `${col}/a`)))
  })
  it('community: lo lee cualquier autenticado, pero no un anónimo', async () => {
    await seed(`${col}/a`, { ...base, visibility: 'community', sharedWith: [] })
    await assertSucceeds(getDoc(doc(db(STRANGER), `${col}/a`)))
    await assertFails(getDoc(doc(db(null), `${col}/a`)))
  })
  it('lector no edita ni borra (aunque pueda leer)', async () => {
    await seed(`${col}/a`, { ...base, visibility: 'community', sharedWith: [FRIEND] })
    const d = doc(db(FRIEND), `${col}/a`)
    await assertFails(updateDoc(d, { name: 'hack' })); await assertFails(deleteDoc(d))
  })
  it('query por sharedWith array-contains funciona; consulta ajena sin filtro falla', async () => {
    await seed(`${col}/a`, { ...base, visibility: 'friends', sharedWith: [FRIEND] })
    await seed(`${col}/b`, { ...base, visibility: 'private', sharedWith: [] })
    const ok = await assertSucceeds(getDocs(query(collection(db(FRIEND), col), where('sharedWith', 'array-contains', FRIEND))))
    expect(ok.size).toBe(1)
    await assertFails(getDocs(collection(db(FRIEND), col)))
  })
  it('el dueño no puede reasignar userId a otra persona (inyectaría docs en su lista)', async () => {
    await seed(`${col}/a`, base)
    await assertFails(updateDoc(doc(db(OWNER), `${col}/a`), { userId: STRANGER }))
    await assertSucceeds(updateDoc(doc(db(OWNER), `${col}/a`), { userId: OWNER, name: 'ok' }))
  })
})

describe('Brindar (cheers) en tastings', () => {
  const note = (over: any = {}) => ({
    userId: OWNER, coffeeName: 'Geisha', ratingOverall: 8, personalNotes: 'rico',
    visibility: 'friends', sharedWith: [FRIEND], ...over,
  })
  const ref = (uid: string) => doc(db(uid), 'tastings/n1')

  it('lector añade su propio brindis', async () => {
    await seed('tastings/n1', note())
    await assertSucceeds(updateDoc(ref(FRIEND), { [`cheers.${FRIEND}`]: true }))
  })
  it('lector quita su propio brindis', async () => {
    await seed('tastings/n1', note({ cheers: { [FRIEND]: true } }))
    await assertSucceeds(updateDoc(ref(FRIEND), { [`cheers.${FRIEND}`]: deleteField() }))
  })
  it('quitar el brindis propio conserva los de otros', async () => {
    await seed('tastings/n1', note({ cheers: { [FRIEND]: true, other: true } }))
    await assertSucceeds(updateDoc(ref(FRIEND), { [`cheers.${FRIEND}`]: deleteField() }))
    expect((await getDoc(doc(db(OWNER), 'tastings/n1'))).data()!.cheers).toEqual({ other: true })
  })
  it('lector de comunidad (no amigo) también puede brindar', async () => {
    await seed('tastings/n1', note({ visibility: 'community', sharedWith: [] }))
    await assertSucceeds(updateDoc(ref(STRANGER), { [`cheers.${STRANGER}`]: true }))
  })
  it('lector NO puede cambiar otros campos', async () => {
    await seed('tastings/n1', note())
    await assertFails(updateDoc(ref(FRIEND), { ratingOverall: 2 }))
    await assertFails(updateDoc(ref(FRIEND), { personalNotes: 'hack' }))
    await assertFails(updateDoc(ref(FRIEND), { sharedWith: [FRIEND, STRANGER] }))
    await assertFails(updateDoc(ref(FRIEND), { visibility: 'community' }))
    await assertFails(updateDoc(ref(FRIEND), { userId: FRIEND }))
  })
  it('lector NO puede mezclar su brindis con otro campo en la misma escritura', async () => {
    await seed('tastings/n1', note())
    await assertFails(updateDoc(ref(FRIEND), { [`cheers.${FRIEND}`]: true, ratingOverall: 10 }))
  })
  it('lector NO puede añadir ni quitar el brindis de otra persona', async () => {
    await seed('tastings/n1', note({ cheers: { other: true } }))
    await assertFails(updateDoc(ref(FRIEND), { 'cheers.other': deleteField() }))
    await assertFails(updateDoc(ref(FRIEND), { 'cheers.someoneElse': true }))
  })
  it('lector NO puede reemplazar el mapa entero para borrar brindis ajenos', async () => {
    await seed('tastings/n1', note({ cheers: { other: true } }))
    await assertFails(updateDoc(ref(FRIEND), { cheers: { [FRIEND]: true } }))
    await assertFails(updateDoc(ref(FRIEND), { cheers: deleteField() }))
  })
  it('quien no puede leer la nota no puede brindar', async () => {
    await seed('tastings/n1', note())
    await assertFails(updateDoc(ref(STRANGER), { [`cheers.${STRANGER}`]: true }))
    await seed('tastings/n2', note({ visibility: 'private', sharedWith: [] }))
    await assertFails(updateDoc(doc(db(STRANGER), 'tastings/n2'), { [`cheers.${STRANGER}`]: true }))
    await assertFails(updateDoc(doc(db(null), 'tastings/n1'), { 'cheers.x': true }))
  })
  it('el lector no puede borrar la nota; el dueño sí edita cheers libremente', async () => {
    await seed('tastings/n1', note())
    await assertFails(deleteDoc(ref(FRIEND)))
    await assertSucceeds(updateDoc(ref(OWNER), { personalNotes: 'editada' }))
  })
  it.fails('BUG: un brindis debe ser exactamente `true` (se acepta false/cadena/objeto y cuenta como brindis)', async () => {
    await seed('tastings/n1', note())
    await assertFails(updateDoc(ref(FRIEND), { [`cheers.${FRIEND}`]: 'x'.repeat(5000) }))
  })
})

describe('recipes y coffees: Brindar no aplica', () => {
  it('lector no puede escribir cheers en una receta ni en un café', async () => {
    for (const col of ['recipes', 'coffees']) {
      await seed(`${col}/a`, { userId: OWNER, visibility: 'friends', sharedWith: [FRIEND] })
      await assertFails(updateDoc(doc(db(FRIEND), `${col}/a`), { [`cheers.${FRIEND}`]: true }))
    }
  })
})

describe('userPreferences', () => {
  it('cada quien solo su documento', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), `userPreferences/${OWNER}`), { theme: 'x' }))
    await assertSucceeds(getDoc(doc(db(OWNER), `userPreferences/${OWNER}`)))
    await assertFails(getDoc(doc(db(STRANGER), `userPreferences/${OWNER}`)))
    await assertFails(setDoc(doc(db(STRANGER), `userPreferences/${OWNER}`), { theme: 'hack' }))
    await assertFails(getDoc(doc(db(null), `userPreferences/${OWNER}`)))
  })
})

describe('ritualOutcomes', () => {
  it('crear y leer solo dueño; update/delete nunca', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), 'ritualOutcomes/a'), { userId: OWNER }))
    await assertFails(setDoc(doc(db(STRANGER), 'ritualOutcomes/b'), { userId: OWNER }))
    await assertSucceeds(getDoc(doc(db(OWNER), 'ritualOutcomes/a')))
    await assertFails(getDoc(doc(db(STRANGER), 'ritualOutcomes/a')))
    await assertFails(updateDoc(doc(db(OWNER), 'ritualOutcomes/a'), { x: 1 }))
    await assertFails(deleteDoc(doc(db(OWNER), 'ritualOutcomes/a')))
  })
})

describe('users', () => {
  it('directorio: cualquier autenticado lee, solo el dueño escribe', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), `users/${OWNER}`), { email: 'a@b.co' }))
    await assertSucceeds(getDoc(doc(db(STRANGER), `users/${OWNER}`)))
    await assertFails(getDoc(doc(db(null), `users/${OWNER}`)))
    await assertFails(setDoc(doc(db(STRANGER), `users/${OWNER}`), { email: 'x@y.co' }))
    await assertFails(deleteDoc(doc(db(STRANGER), `users/${OWNER}`)))
  })
})

describe('waitlist', () => {
  const ok = { email: 'a@b.co', source: 'landing', createdAt: 1 }
  it('crea anónimo con forma válida; nadie lee/edita/borra', async () => {
    await assertSucceeds(setDoc(doc(db(null), 'waitlist/a@b.co'), ok))
    await assertFails(getDoc(doc(db(OWNER), 'waitlist/a@b.co')))
    await assertFails(updateDoc(doc(db(OWNER), 'waitlist/a@b.co'), { source: 'x' }))
    await assertFails(deleteDoc(doc(db(OWNER), 'waitlist/a@b.co')))
  })
  it('rechaza id≠email, email inválido, campos extra o duplicado', async () => {
    await assertFails(setDoc(doc(db(null), 'waitlist/otro@b.co'), ok))
    await assertFails(setDoc(doc(db(null), 'waitlist/malo'), { ...ok, email: 'malo' }))
    await assertFails(setDoc(doc(db(null), 'waitlist/a@b.co'), { ...ok, extra: 1 }))
    await assertSucceeds(setDoc(doc(db(null), 'waitlist/a@b.co'), ok))
    await assertFails(setDoc(doc(db(null), 'waitlist/a@b.co'), ok))
  })
})

describe.each(['roasters', 'wishlist'])('%s: userId fijo', (col) => {
  it('el dueño edita pero no puede reasignar userId', async () => {
    await seed(`${col}/a`, { userId: OWNER, name: 'x' })
    await assertSucceeds(updateDoc(doc(db(OWNER), `${col}/a`), { name: 'y' }))
    await assertFails(updateDoc(doc(db(OWNER), `${col}/a`), { userId: STRANGER }))
  })
})

describe('friendships', () => {
  const pending = { uids: [OWNER, FRIEND], status: 'pending', initiatedBy: OWNER }
  it('crear: debe ser participante, pending e initiatedBy propio', async () => {
    await assertSucceeds(setDoc(doc(db(OWNER), 'friendships/f1'), pending))
    await assertFails(setDoc(doc(db(STRANGER), 'friendships/f2'), pending))
    await assertFails(setDoc(doc(db(OWNER), 'friendships/f3'), { ...pending, status: 'accepted' }))
    await assertFails(setDoc(doc(db(OWNER), 'friendships/f4'), { ...pending, initiatedBy: FRIEND }))
  })
  it('solo participantes leen, aceptan y borran', async () => {
    await seed('friendships/f1', pending)
    await assertSucceeds(getDoc(doc(db(FRIEND), 'friendships/f1')))
    await assertFails(getDoc(doc(db(STRANGER), 'friendships/f1')))
    await assertFails(updateDoc(doc(db(STRANGER), 'friendships/f1'), { status: 'accepted' }))
    await assertSucceeds(updateDoc(doc(db(FRIEND), 'friendships/f1'), { status: 'accepted' }))
    await assertFails(deleteDoc(doc(db(STRANGER), 'friendships/f1')))
    await assertSucceeds(deleteDoc(doc(db(FRIEND), 'friendships/f1')))
  })
  it('quien envía la solicitud no puede aceptarla él mismo', async () => {
    await seed('friendships/f1', pending)
    await assertFails(updateDoc(doc(db(OWNER), 'friendships/f1'), { status: 'accepted' }))
  })
  it('un participante no puede añadir un tercer uid a la amistad', async () => {
    await seed('friendships/f1', pending)
    await assertFails(updateDoc(doc(db(OWNER), 'friendships/f1'), { uids: [OWNER, FRIEND, STRANGER] }))
    await assertFails(updateDoc(doc(db(FRIEND), 'friendships/f1'), { status: 'accepted', uids: [OWNER, FRIEND, STRANGER] }))
  })
  it('aceptar solo cambia status (y updatedAt), y solo desde pending', async () => {
    await seed('friendships/f1', pending)
    await assertFails(updateDoc(doc(db(FRIEND), 'friendships/f1'), { status: 'accepted', initiatedBy: FRIEND }))
    await assertFails(updateDoc(doc(db(FRIEND), 'friendships/f1'), { status: 'blocked' }))
    await assertSucceeds(updateDoc(doc(db(FRIEND), 'friendships/f1'), { status: 'accepted', updatedAt: new Date() }))
    await assertFails(updateDoc(doc(db(FRIEND), 'friendships/f1'), { status: 'pending' }))
    await assertFails(updateDoc(doc(db(OWNER), 'friendships/f1'), { status: 'accepted', updatedAt: new Date() }))
  })
  it('crear: exactamente dos uids distintos', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'friendships/f5'), { ...pending, uids: [OWNER, FRIEND, STRANGER] }))
    await assertFails(setDoc(doc(db(OWNER), 'friendships/f6'), { ...pending, uids: [OWNER, OWNER] }))
  })
})

describe('default deny', () => {
  it('colecciones desconocidas: nadie lee ni escribe', async () => {
    await seed('secretos/a', { x: 1 })
    await assertFails(getDoc(doc(db(OWNER), 'secretos/a')))
    await assertFails(setDoc(doc(db(OWNER), 'secretos/b'), { userId: OWNER }))
    await assertFails(getDoc(doc(db(null), 'secretos/a')))
  })
  it('subcolecciones no declaradas también se niegan', async () => {
    await assertFails(setDoc(doc(db(OWNER), 'tastings/a/privado/b'), { userId: OWNER }))
  })
  it('anónimos no leen nada de lo declarado', async () => {
    await seed('roasters/a', { userId: OWNER })
    await assertFails(getDoc(doc(db(null), 'roasters/a')))
  })
})
