import { Routes, Route, Navigate } from 'react-router-dom'
import { jwtDecode } from 'jwt-decode'
import Login from './pages/Login'
import PoliceDashboard from './pages/PoliceDashboard'
import FSLDashboard from './pages/FSLDashboard'
import JudiciaryDashboard from './pages/JudiciaryDashboard'
import EvidenceRoomDashboard from './pages/EvidenceRoomDashboard'
import SystemHealthFooter from './components/SystemHealthFooter'

/** Returns the decoded role from the stored JWT, or null if absent/expired. */
function getRole() {
  try {
    const token = localStorage.getItem('access')
    if (!token) return null
    const decoded = jwtDecode(token)
    if (decoded.exp * 1000 < Date.now()) return null
    return decoded.role || null
  } catch {
    return null
  }
}

/** Protect a route; redirect to /login if not authenticated or wrong role. */
function ProtectedRoute({ element, requiredRole }) {
  const role = getRole()
  if (!role) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />
  return element
}

function App() {
  return (
    <div style={{ padding: '0px' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/police-dashboard"
          element={<ProtectedRoute element={<PoliceDashboard />} requiredRole="POLICE" />}
        />
        <Route
          path="/fsl-dashboard"
          element={<ProtectedRoute element={<FSLDashboard />} requiredRole="FSL" />}
        />
        <Route
          path="/judiciary-dashboard"
          element={<ProtectedRoute element={<JudiciaryDashboard />} requiredRole="JUDICIARY" />}
        />
        <Route
          path="/evidence-room-dashboard"
          element={<ProtectedRoute element={<EvidenceRoomDashboard />} requiredRole="EVIDENCE_ROOM" />}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
      <SystemHealthFooter />
    </div>
  )
}

export default App
