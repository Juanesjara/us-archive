import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './hooks/useAuth'
import { RequireAdmin, RequireAuth, RequireConfig, RequireIntro, Root } from './routes/guards'
import { Login } from './routes/Login'
import { IntroInside, IntroStart, IntroWhy } from './routes/onboarding/Intro'
import { AppShell } from './components/layout/AppShell'
import { Home } from './routes/archive/Home'
import { Photos } from './routes/archive/Photos'
import { Memories } from './routes/archive/Memories'
import { Places } from './routes/archive/Places'
import { Things } from './routes/archive/Things'
import { LookAtMe, OneMoreThing } from './routes/OneMoreThing'
import { AdminShell } from './routes/admin/AdminShell'
import { AdminPhotos } from './routes/admin/AdminPhotos'
import { AdminMemories } from './routes/admin/AdminMemories'
import { AdminPlaces } from './routes/admin/AdminPlaces'
import { AdminThings } from './routes/admin/AdminThings'
import { AdminOfficial } from './routes/admin/AdminOfficial'

export default function App() {
  return (
    <RequireConfig>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Root />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/intro"
              element={
                <RequireAuth>
                  <IntroStart />
                </RequireAuth>
              }
            />
            <Route
              path="/intro/why"
              element={
                <RequireAuth>
                  <IntroWhy />
                </RequireAuth>
              }
            />
            <Route
              path="/intro/inside"
              element={
                <RequireAuth>
                  <IntroInside />
                </RequireAuth>
              }
            />

            <Route
              path="/archive"
              element={
                <RequireAuth>
                  <RequireIntro>
                    <AppShell />
                  </RequireIntro>
                </RequireAuth>
              }
            >
              <Route index element={<Home />} />
              <Route path="photos" element={<Photos />} />
              <Route path="memories" element={<Memories />} />
              <Route path="places" element={<Places />} />
              <Route path="things" element={<Things />} />
            </Route>

            <Route
              path="/one-more-thing"
              element={
                <RequireAuth>
                  <OneMoreThing />
                </RequireAuth>
              }
            />
            <Route
              path="/one-more-thing/look"
              element={
                <RequireAuth>
                  <LookAtMe />
                </RequireAuth>
              }
            />

            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <RequireAdmin>
                    <AdminShell />
                  </RequireAdmin>
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="photos" replace />} />
              <Route path="photos" element={<AdminPhotos />} />
              <Route path="memories" element={<AdminMemories />} />
              <Route path="places" element={<AdminPlaces />} />
              <Route path="things" element={<AdminThings />} />
              <Route path="official" element={<AdminOfficial />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </RequireConfig>
  )
}
