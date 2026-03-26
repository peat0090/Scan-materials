import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const IconDashboard = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const IconScan = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
    <line x1="7" y1="12" x2="17" y2="12" />
  </svg>
)
const IconWithdraw = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1" />
    <path d="M15 12H3" /><path d="M11 8l-4 4 4 4" /><path d="M21 12h-6" />
  </svg>
)
const IconHistory = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
  </svg>
)
const IconOut = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
  </svg>
)
const IconLogout = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

// renderIcon เป็น function (size) => JSX แทนการเก็บ component
// เพื่อหลีกเลี่ยง ESLint no-unused-vars จาก destructuring Icon ใน map
const NAV_ITEMS = [
  { to: '/',                 label: 'หน้าหลัก', renderIcon: (s) => <IconDashboard size={s} /> },
  { to: '/scan',             label: 'สแกน',     renderIcon: (s) => <IconScan      size={s} /> },
  { to: '/withdraw',         label: 'เบิก',      renderIcon: (s) => <IconWithdraw  size={s} /> },
  { to: '/history',          label: 'รับเข้า',  renderIcon: (s) => <IconHistory   size={s} /> },
  { to: '/withdraw-history', label: 'เบิกออก',  renderIcon: (s) => <IconOut       size={s} /> },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (to) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  return (
    <>
      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-white/8">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0 mr-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-white hidden sm:block tracking-tight">QR Inventory</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ to, label, renderIcon }) => {
              const active = isActive(to)
              return (
                <Link key={to} to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    active ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {renderIcon(15)}
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile: spacer + centered page title */}
          <div className="flex-1 md:hidden" />
          <div className="md:hidden absolute left-1/2 -translate-x-1/2 pointer-events-none">
            {NAV_ITEMS.map(({ to, label }) =>
              isActive(to)
                ? <span key={to} className="text-sm font-semibold text-white">{label}</span>
                : null
            )}
          </div>

          {/* Right: avatar + logout */}
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            {user && (
              <div className="hidden sm:flex items-center gap-2 mr-1">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white select-none">
                  {user.fullname?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="text-xs text-slate-400 max-w-24 truncate hidden lg:block">
                  {user.fullname}
                </span>
              </div>
            )}
            <button onClick={handleLogout} title="ออกจากระบบ"
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
            >
              <IconLogout size={16} />
              <span className="hidden sm:block">ออก</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── BOTTOM TAB BAR (mobile only) ─────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-white/8">
        <div className="flex items-stretch h-16">
          {NAV_ITEMS.map(({ to, label, renderIcon }) => {
            const active = isActive(to)
            return (
              <Link key={to} to={to}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
                  active ? 'text-white' : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                <div className={`relative flex items-center justify-center w-10 h-6 rounded-lg transition-all ${
                  active ? 'bg-white/12' : ''
                }`}>
                  {renderIcon(19)}
                  {active && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-400" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${active ? 'text-white' : 'text-slate-600'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
        <div className="h-safe-bottom" />
      </nav>

      {/* Spacer so page content clears bottom tab bar on mobile */}
      <div className="md:hidden h-16" />
    </>
  )
}
