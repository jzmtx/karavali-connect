import { config } from '../lib/config'

/**
 * Upload image to Cloudinary
 * @param {File} file - Image file to upload
 * @returns {Promise<string>} Public URL of uploaded image
 */
export async function uploadImage(file) {
  if (!config.cloudinary.cloudName || !config.cloudinary.uploadPreset) {
    // Fallback: Convert to base64 for development
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', config.cloudinary.uploadPreset)
  formData.append('folder', 'karavali-connect')

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudinary.cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData
      }
    )

    const data = await response.json()
    return data.secure_url || data.url
  } catch (error) {
    console.error('Cloudinary upload failed:', error)
    // Fallback to base64
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(file)
    })
  }
}

