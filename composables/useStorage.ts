import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export const useStorageUpload = () => {
  const { $storage } = useNuxtApp()

  const uploadPhoto = async (file: File, path: string): Promise<string> => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Tipo de archivo no permitido. Solo JPEG, PNG, WebP y GIF.')
    }
    if (file.size > MAX_SIZE) {
      throw new Error('Archivo demasiado grande. Máximo 5MB.')
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileRef = storageRef($storage, `${path}/${Date.now()}_${safeName}`)
    const snapshot = await uploadBytes(fileRef, file, {
      contentType: file.type,
    })
    return getDownloadURL(snapshot.ref)
  }

  const deletePhoto = async (url: string): Promise<void> => {
    try {
      const fileRef = storageRef($storage, url)
      await deleteObject(fileRef)
    } catch {
      // If the file doesn't exist or URL is invalid, fail silently
    }
  }

  return {
    uploadPhoto,
    deletePhoto,
  }
}
