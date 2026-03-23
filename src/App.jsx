import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoginPage      from './pages/LoginPage'
import DashboardPage  from './pages/DashboardPage'
import ScanPage       from './pages/ScanPage'
import HistoryPage    from './pages/HistoryPage'
import ItemDetailPage from './pages/ItemDetailPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function CanScanRoute({ children }) {
  const { user, can } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return can('scan') ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/"            element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/scan"        element={<CanScanRoute><ScanPage /></CanScanRoute>} />
        <Route path="/history"     element={<PrivateRoute><HistoryPage /></PrivateRoute>} />
        <Route path="/items/:id"   element={<PrivateRoute><ItemDetailPage /></PrivateRoute>} />
        <Route path="*"            element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
