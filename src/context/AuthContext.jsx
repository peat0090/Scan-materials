import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const PERMISSIONS = {
  admin:      ['scan', 'view', 'export', 'manage_users', 'delete'],
  manager:    ['scan', 'view', 'export'],
  warehouse:  ['scan', 'view'],
  viewer:     ['view'],
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('auth_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const login = async (email, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', email.trim())
      .single()

    if (error || !data) return { success: false, message: 'ไม่พบบัญชีนี้ในระบบ' }
    if (data.password !== password) return { success: false, message: 'รหัสผ่านไม่ถูกต้อง' }

    const { password: _pw, ...safeUser } = data
    safeUser.role = safeUser.role?.toLowerCase()

    localStorage.setItem('auth_user', JSON.stringify(safeUser))
    setUser(safeUser)
    return { success: true }
  }

  const logout = () => {
    localStorage.removeItem('auth_user')
    setUser(null)
  }

  const can = (action) => {
    if (!user) return false
    return PERMISSIONS[user.role]?.includes(action) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
