import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  linkWithCredential,
  GoogleAuthProvider,
  EmailAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore'

const currentUser = ref<User | null>(null)
const authLoading = ref(true)
let _initialized = false

export const useAuth = () => {
  const { $auth } = useNuxtApp()
  const router = useRouter()

  // Solo iniciamos el listener en cliente — durante prerender (Nuxt
  // static build de páginas públicas) $auth no existe porque el plugin
  // de Firebase es .client.ts. currentUser permanece null en el HTML
  // generado y la hidratación lo actualiza al cargar en el browser.
  if (import.meta.client && !_initialized) {
    _initialized = true
    onAuthStateChanged($auth, async (user) => {
      currentUser.value = user
      authLoading.value = false
      // Upsert user profile in Firestore so others can find them by email
      if (user && user.email) {
        try {
          const { upsertProfile } = useUsers()
          await upsertProfile({
            id: user.uid,
            email: user.email.toLowerCase(),
            displayName: user.displayName || undefined,
            photoURL: user.photoURL || undefined,
          })
        } catch (e) {
          console.error('Failed to upsert user profile:', e)
        }
      }
    })
  }

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword($auth, email, password)
    currentUser.value = credential.user
    return credential.user
  }

  const register = async (email: string, password: string, displayName?: string) => {
    const credential = await createUserWithEmailAndPassword($auth, email, password)
    if (displayName) {
      await updateProfile(credential.user, { displayName })
    }
    currentUser.value = credential.user
    return credential.user
  }

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    try {
      const credential = await signInWithPopup($auth, provider)
      currentUser.value = credential.user
      return credential.user
    } catch (e: any) {
      // If user already has an email/password account, link them
      if (e.code === 'auth/account-exists-with-different-credential') {
        const email = e.customData?.email
        if (email) {
          throw {
            code: 'auth/account-exists-with-different-credential',
            message: `Ya existe una cuenta con ${email}. Inicia sesión con tu contraseña para vincular Google.`,
            email,
            credential: GoogleAuthProvider.credentialFromError(e),
          }
        }
      }
      throw e
    }
  }

  const linkEmailPassword = async (password: string) => {
    if (!currentUser.value?.email) throw new Error('No hay sesión activa con email')
    const credential = EmailAuthProvider.credential(currentUser.value.email, password)
    try {
      const result = await linkWithCredential(currentUser.value, credential)
      currentUser.value = result.user
      return result.user
    } catch (e: any) {
      if (e.code === 'auth/provider-already-linked') {
        throw new Error('Esta cuenta ya tiene contraseña configurada')
      }
      if (e.code === 'auth/credential-already-in-use') {
        throw new Error('Este correo ya está vinculado a otra cuenta')
      }
      throw e
    }
  }

  const resetPassword = (email: string) => sendPasswordResetEmail($auth, email)

  const logout = async () => {
    await signOut($auth)
    currentUser.value = null
    // Clear all app stores so no data leaks between users
    try {
      useCoffeesStore().reset()
      useTastingsStore().reset()
      useRecipesStore().reset()
      useRoastersStore().reset()
      useWishlistStore().reset()
      useFriendsStore().reset()
      useSettingsStore().reset()
    } catch (e) {
      console.error('Failed to reset stores on logout:', e)
    }
    router.push('/login')
  }

  /**
   * Elimina la cuenta del usuario actual de forma permanente:
   *  1. Borra todos sus documentos en Firestore (cafés, catas, recetas,
   *     wishlist, marcas) por query userId.
   *  2. Borra friendships donde aparece.
   *  3. Borra users/{uid} y userPreferences/{uid}.
   *  4. Borra la cuenta de Firebase Auth.
   *  5. Limpia stores y redirige a la landing.
   *
   * Acción IRREVERSIBLE. Si Auth pide reautenticación reciente, Firebase
   * tira el error `auth/requires-recent-login` y el caller debe pedir
   * al usuario que cierre sesión y vuelva a entrar.
   */
  const deleteAccount = async () => {
    if (!currentUser.value) throw new Error('No hay sesión activa')
    const { $db } = useNuxtApp()
    const uid = currentUser.value.uid

    // 1. Colecciones donde el dueño se identifica por `userId`.
    const userScopedCollections = ['coffees', 'tastings', 'recipes', 'wishlist', 'roasters']
    for (const coll of userScopedCollections) {
      const q = query(collection($db, coll), where('userId', '==', uid))
      const snap = await getDocs(q)
      await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
    }

    // 2. Friendships donde el usuario aparece (cualquiera de los 2 lados).
    const friendsQ = query(
      collection($db, 'friendships'),
      where('uids', 'array-contains', uid),
    )
    const friendsSnap = await getDocs(friendsQ)
    await Promise.all(friendsSnap.docs.map(d => deleteDoc(d.ref)))

    // 3. Perfil + preferencias (clave = uid).
    await deleteDoc(doc($db, 'users', uid)).catch(() => {})
    await deleteDoc(doc($db, 'userPreferences', uid)).catch(() => {})

    // 4. Cuenta de Firebase Auth — puede pedir reautenticación reciente.
    await $auth.currentUser?.delete()

    // 5. Reset local + redirect.
    currentUser.value = null
    try {
      useCoffeesStore().reset()
      useTastingsStore().reset()
      useRecipesStore().reset()
      useRoastersStore().reset()
      useWishlistStore().reset()
      useFriendsStore().reset()
      useSettingsStore().reset()
    }
    catch { /* ignore */ }
    router.push('/')
  }

  const userId = computed(() => currentUser.value?.uid || null)

  return {
    currentUser: readonly(currentUser),
    authLoading: readonly(authLoading),
    userId,
    login,
    register,
    loginWithGoogle,
    linkEmailPassword,
    logout,
    resetPassword,
    deleteAccount,
  }
}
