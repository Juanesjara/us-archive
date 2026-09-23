import { Link, NavLink, Outlet } from 'react-router'
import { Wordmark } from '../../components/ui/Wordmark'
import { resetIntro } from '../../lib/onboarding'

const nav = [
  { to: '/admin/photos', label: 'Fotos' },
  { to: '/admin/official', label: 'Oficial' },
]

export function AdminShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 pt-6 sm:px-10 sm:pt-8">
        <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between">
          <div className="flex items-baseline gap-3">
            <Link to="/archive" className="text-[1.75rem] leading-none">
              <Wordmark />
            </Link>
            <span className="text-meta text-muted">Administrar</span>
          </div>
          <Link to="/archive" className="text-meta text-muted hover:text-ink">
            Volver al archivo
          </Link>
        </div>
        <nav aria-label="Administrar" className="mx-auto mt-8 w-full max-w-3xl">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-ui sm:gap-x-8">
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
                        <span aria-hidden="true" className="absolute -bottom-1 left-0 h-1 w-1 rounded-full bg-accent" />
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
        <div className="mx-auto w-full max-w-3xl">
          <Outlet />
        </div>
      </main>

      <footer className="px-6 pb-8 sm:px-10">
        <div className="mx-auto w-full max-w-3xl text-meta text-faint">
          <button
            type="button"
            className="hover:text-muted"
            onClick={() => {
              resetIntro()
              window.location.assign('/intro')
            }}
          >
            Ver la intro otra vez en este dispositivo
          </button>
        </div>
      </footer>
    </div>
  )
}
