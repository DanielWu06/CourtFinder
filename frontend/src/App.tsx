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

function App() {
  return (
    <AuthProvider>
          <Navbar />
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/local" element={<LocalPlay />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />

            {/* Protected */}
            <Route path="/create" element={<ProtectedRoute><CreateListing /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/find" element={<ProtectedRoute><FindListing /></ProtectedRoute>} />
            <Route path="/my-games" element={<ProtectedRoute><MyGames /></ProtectedRoute>} />
          </Routes>
      </AuthProvider>
  )
} 

export default App