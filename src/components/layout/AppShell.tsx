import { Link, NavLink, Outlet } from 'react-router'
import { useAuth } from '../../hooks/useAuth'
import { Wordmark } from '../ui/Wordmark'

const nav = [
  { to: '/archive/memories', label: 'Recuerdos' },
  { to: '/archive/photos', label: 'Fotos' },
  { to: '/archive/places', label: 'Lugares' },
  { to: '/archive/things', label: 'Cosas' },
]

export function AppShell() {
  const { isAdmin, signOut } = useAuth()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 pt-6 sm:px-10 sm:pt-8">
        <div className="mx-auto flex w-full max-w-5xl items-baseline justify-between">
          <Link to="/archive" className="text-[1.75rem] leading-none">
            <Wordmark />
          </Link>
          <div className="flex items-baseline gap-5 text-meta text-muted">
            {isAdmin ? (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? 'text-ink' : 'hover:text-ink')}>
                Administrar
              </NavLink>
            ) : null}
            <button type="button" onClick={() => void signOut()} className="hover:text-ink">
              Salir
            </button>
          </div>
        </div>
        <nav aria-label="Archivo" className="mx-auto mt-8 w-full max-w-5xl">
          <ul className="flex gap-6 text-ui sm:gap-8">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `relative py-1 transition-colors ${isActive ? 'text-ink' : 'text-muted hover:text-ink'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive ? (
                        <span
                          aria-hidden="true"
                          className="absolute -bottom-1 left-0 h-1 w-1 rounded-full bg-accent"
                        />
                      ) : null}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="flex-1 px-6 pb-24 pt-12 sm:px-10 sm:pt-16">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
