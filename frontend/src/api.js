const BASE = '/api'
const TOKEN_KEY = 'careernova.token'

// The token lives in sessionStorage, so it belongs to this browser tab only:
// closing the tab signs out, and opening the link on another device or in a new
// window always starts at the sign-in screen.
let token = sessionStorage.getItem(TOKEN_KEY) ?? null

// Drop tokens kept by the earlier build, which remembered the login forever.
localStorage.removeItem(TOKEN_KEY)

export function setToken(value) {
  token = value
  if (value) sessionStorage.setItem(TOKEN_KEY, value)
  else sessionStorage.removeItem(TOKEN_KEY)
}

export function getToken() {
  return token
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, options) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`
    try {
      const body = await response.json()
      if (body?.detail) detail = body.detail
    } catch {
      // Response had no JSON body; the status-based message is enough.
    }
    throw new ApiError(detail, response.status)
  }

  return response.status === 204 ? null : response.json()
}

export const getHealth = () => request('/health')

export const getSkills = () => request('/skills')

export const getMetrics = () => request('/metrics')

export const getCareer = (title) =>
  request(`/careers/${encodeURIComponent(title)}`)

export const recommend = (payload) =>
  request('/recommend', { method: 'POST', body: JSON.stringify(payload) })

export const analyze = (payload) =>
  request('/analyze', { method: 'POST', body: JSON.stringify(payload) })

export const register = (payload) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })

export const login = (payload) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })

export const checkUsername = (username) =>
  request(`/auth/available?username=${encodeURIComponent(username)}`)

export const me = () => request('/auth/me')

export const setAvatar = (avatar) =>
  request('/auth/avatar', { method: 'PUT', body: JSON.stringify({ avatar }) })

export const logout = () => request('/auth/logout', { method: 'POST' })

export const savePath = (payload) =>
  request('/saved-paths', { method: 'POST', body: JSON.stringify(payload) })

export const getSavedPaths = () => request('/saved-paths')

export const deleteSavedPath = (id) =>
  request(`/saved-paths/${encodeURIComponent(id)}`, { method: 'DELETE' })
