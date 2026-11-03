import { Routes, Route } from 'react-router-dom'

import Navbar from './components/Navbar'
import Home from './pages/Home'
import CreateListing from './pages/CreateListing'
import FindListing from './pages/FindListing'
import LocalPlay from './pages/LocalPlay'
import { AuthProvider } from './auth/AuthContext'
import ProtectedRoute from './auth/ProtectedRoute'
import AuthPage from './pages/AuthPage'
import Profile from './pages/Profile'
import MyGames from './pages/MyGames'
import VenueNew from './pages/VenueNew'
import VenueManage from './pages/VenueManage'
import VenuePage from './pages/VenuePage'
import VenueStaff from './pages/VenueStaff'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <AuthProvider>
          <Navbar />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected */}
            <Route path="/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/find" element={<ProtectedRoute><FindListing /></ProtectedRoute>} />
            <Route path="/my-games" element={<ProtectedRoute><MyGames /></ProtectedRoute>} />
            <Route path="/local/new" element={<ProtectedRoute><VenueNew /></ProtectedRoute>} />
            <Route path="/local/:code" element={<ProtectedRoute><VenuePage /></ProtectedRoute>} />
            <Route path="/local/:code/manage" element={<ProtectedRoute><VenueManage /></ProtectedRoute>} />
            <Route path="/local/:code/staff" element={<ProtectedRoute><VenueStaff /></ProtectedRoute>} />
            <Route path="/local" element={<ProtectedRoute><LocalPlay /></ProtectedRoute>} />
          </Routes>
      </AuthProvider>
  )
} 

export default App