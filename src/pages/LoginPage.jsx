import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleLabel = {
  admin:     { th: 'ผู้ดูแลระบบ', color: 'text-red-500' },
  manager:   { th: 'ผู้จัดการ',   color: 'text-amber-500' },
  warehouse: { th: 'คลังสินค้า',  color: 'text-blue-500' },
  viewer:    { th: 'ผู้ชม',       color: 'text-slate-400' },
}

// Demo accounts – replace with your real Supabase users
const DEMO_USERS = [
  { email: 'admin@demo.com',     fullname: 'Admin User',    role: 'admin',     section: 'IT' },
  { email: 'manager@demo.com',   fullname: 'Manager User',  role: 'manager',   section: 'Logistics' },
  { email: 'warehouse@demo.com', fullname: 'Warehouse User',role: 'warehouse', section: 'Warehouse A' },
  { email: 'viewer@demo.com',    fullname: 'View Only',     role: 'viewer',    section: 'Office' },
]

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email, password)
    if (result.success) navigate('/')
    else setError(result.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm fade-in">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4 border border-white/10">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">QR Inventory</h1>
          <p className="text-slate-500 text-sm mt-1">ระบบบันทึกสินค้าด้วย QR Code</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm mb-5">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest">อีเมล</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-widest">รหัสผ่าน</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-white/30 focus:border-white/30 transition"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full bg-white text-slate-900 font-semibold rounded-xl py-3 text-sm transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-50 mt-2"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-5 border-t border-white/10 pt-5">
            <p className="text-slate-500 text-xs mb-3 uppercase tracking-widest">บัญชีทดสอบ (password: 1234)</p>
            <div className="space-y-1">
              {DEMO_USERS.map(u => (
                <button
                  key={u.email}
                  onClick={() => { setEmail(u.email); setPassword('1234') }}
                  className="w-full flex justify-between items-center text-xs px-3 py-2 rounded-lg hover:bg-white/5 transition text-left"
                >
                  <div>
                    <span className="text-slate-300 font-medium">{u.fullname}</span>
                    <span className="text-slate-600 block">{u.email}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${roleLabel[u.role]?.color ?? 'text-slate-400'}`}>
                      {roleLabel[u.role]?.th ?? u.role}
                    </span>
                    <span className="text-slate-600 block">{u.section}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
