import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastViewport } from './components/common/ToastViewport'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { PublicLayout } from './components/layout/PublicLayout'
import { AppStateProvider } from './context/AppStateContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { CalibrationPage } from './pages/CalibrationPage'
import { GamePage } from './pages/GamePage'
import { LoginPage } from './pages/LoginPage'
import { PatientNewPage } from './pages/PatientNewPage'
import { PreGamePage } from './pages/PreGamePage'
import { RegisterPage } from './pages/RegisterPage'
import { RecordsPage } from './pages/RecordsPage'
import { ReportsPage } from './pages/ReportsPage'
import { ResultsPage } from './pages/ResultsPage'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppStateProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicLayout>
                    <LoginPage />
                  </PublicLayout>
                }
              />

              <Route
                path="/register"
                element={
                  <PublicLayout>
                    <RegisterPage />
                  </PublicLayout>
                }
              />

              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Navigate to="/records" replace />} />
                <Route path="/records" element={<RecordsPage />} />
                <Route path="/patients/new" element={<PatientNewPage />} />
                <Route path="/calibration" element={<CalibrationPage />} />
                <Route path="/pre-game" element={<PreGamePage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/records" replace />} />
            </Routes>
            <ToastViewport />
          </BrowserRouter>
        </AppStateProvider>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
