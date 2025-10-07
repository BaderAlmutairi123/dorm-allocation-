export interface User {
  id: number
  email: string
  name: string
  studentId: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export const getAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false
    }
  }

  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  
  if (!token || !userStr) {
    return {
      user: null,
      token: null,
      isAuthenticated: false
    }
  }

  try {
    const user = JSON.parse(userStr)
    return {
      user,
      token,
      isAuthenticated: true
    }
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return {
      user: null,
      token: null,
      isAuthenticated: false
    }
  }
}

export const setAuthState = (user: User, token: string) => {
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
}

export const clearAuthState = () => {
  localStorage.removeItem('user')
  localStorage.removeItem('token')
}

export const isAuthenticated = (): boolean => {
  return getAuthState().isAuthenticated
}