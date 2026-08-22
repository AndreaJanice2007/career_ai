// Profile pictures are cropped and shrunk in the browser before upload, so the
// server only ever stores a small square thumbnail.

export const AVATAR_SIZE = 256
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export const PRESETS = [
  { id: 'nova', label: 'Nova', from: '#a78bfa', to: '#22d3ee' },
  { id: 'sunset', label: 'Sunset', from: '#fb7185', to: '#fbbf24' },
  { id: 'forest', label: 'Forest', from: '#34d399', to: '#a3e635' },
  { id: 'ocean', label: 'Ocean', from: '#38bdf8', to: '#6366f1' },
  { id: 'ember', label: 'Ember', from: '#f97316', to: '#e11d48' },
  { id: 'graphite', label: 'Graphite', from: '#94a3b8', to: '#334155' },
]

function canvas() {
  const element = document.createElement('canvas')
  element.width = AVATAR_SIZE
  element.height = AVATAR_SIZE
  return element
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be opened as an image.'))
    }
    image.src = url
  })
}

/** Center-crops `file` to a square thumbnail and returns it as a data URL. */
export async function fileToAvatar(file) {
  if (!file) throw new Error('No image was selected.')
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Pick a PNG, JPEG, WebP or GIF image.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That image is larger than 12 MB. Try a smaller one.')
  }

  const image = await loadImage(file)
  const side = Math.min(image.width, image.height)
  const element = canvas()
  const context = element.getContext('2d')
  context.imageSmoothingQuality = 'high'
  context.drawImage(
    image,
    (image.width - side) / 2,
    (image.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  )
  return element.toDataURL('image/jpeg', 0.85)
}

/** Draws a gradient tile with the user's initials, for the built-in choices. */
export function presetAvatar(preset, username) {
  const element = canvas()
  const context = element.getContext('2d')

  const gradient = context.createLinearGradient(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  gradient.addColorStop(0, preset.from)
  gradient.addColorStop(1, preset.to)
  context.fillStyle = gradient
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)

  const initials = (username ?? '')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  context.fillStyle = 'rgba(5, 6, 15, 0.82)'
  context.font = `600 ${AVATAR_SIZE * 0.42}px Outfit, system-ui, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(initials || '★', AVATAR_SIZE / 2, AVATAR_SIZE / 2 + 6)

  return element.toDataURL('image/png')
}
