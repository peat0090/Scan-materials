import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roleColor = {
  admin:     'bg-red-500',
  manager:   'bg-amber-500',
  warehouse: 'bg-blue-500',
  viewer:    'bg-slate-500',
}

export default function Navbar() {
  const { user, logout, can } = useAuth()
  const location = useLocation()

  const navLinks = [
    { to: '/',                 label: 'ภาพรวม',      icon: '◻' },
    { to: '/history',          label: 'ประวัติการรับ',  icon: '◫' },
    { to: '/withdraw/history', label: 'ประวัติการเบิก',  icon: '📋' },
  ]

  return (
    <nav className="bg-slate-950 border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm hidden sm:block">QR Inventory</span>
        </Link>

        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                location.pathname === l.to
                  ? 'bg-white/10 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">

        {/* ปุ่มสแกน QR */}
        {can('scan') && (
          <Link
            to="/scan"
            className="flex items-center gap-1.5 bg-white text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 active:scale-95 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
            </svg>
            <span className="hidden sm:inline">QR</span>
            <span className="sm:hidden">สแกน</span>
          </Link>
        )}
        
                {/* ปุ่มเบิกใช้ */}
        {can('scan') && (
          <Link
            to="/withdraw"
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg active:scale-95 transition border ${
              location.pathname === '/withdraw'
                ? 'bg-red-500/20 border-red-500/40 text-red-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300'
            }`}
          >
            
            <span className="hidden sm:inline">เบิกใช้</span>
          </Link>
        )}

        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 ${roleColor[user?.role] ?? 'bg-slate-600'} rounded-full flex items-center justify-center text-white text-xs font-bold`}>
            {user?.fullname?.charAt(0)}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium text-white leading-tight">{user?.fullname}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="text-xs text-slate-500 hover:text-red-400 transition"
        >
          ออก
        </button>
      </div>
    </nav>
  )
}
