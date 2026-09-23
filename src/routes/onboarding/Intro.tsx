import { useNavigate } from 'react-router'
import { Screen } from '../../components/ui/Screen'
import { Wordmark } from '../../components/ui/Wordmark'
import { Button, LinkButton, Arrow } from '../../components/ui/Button'
import { markIntroSeen } from '../../lib/onboarding'

/* Screen 1: intro */
export function IntroStart() {
  return (
    <Screen centered>
      <Wordmark className="text-display sm:text-[6rem]" />
      <p className="serif enter-late mt-6 text-lead text-muted">Un pequeño lugar para los dos.</p>
      <div className="enter-later mt-14">
        <LinkButton to="/intro/why">
          Empezar <Arrow />
        </LinkButton>
      </div>
    </Screen>
  )
}

/* Screen 2: why this exists */
export function IntroWhy() {
  return (
    <Screen>
      <h1 className="serif text-title text-ink">Entonces... ¿qué es esto?</h1>
      <div className="serif enter-late mt-8 space-y-5 text-prose text-body">
        <p>Hice esto porque una vez me dijiste que debería tener más fotos de nosotros.</p>
        <p>Así que hice algo al respecto.</p>
      </div>
      <div className="enter-later mt-14">
        <LinkButton to="/intro/inside">
          Continuar <Arrow />
        </LinkButton>
      </div>
    </Screen>
  )
}

/* Screen 3: what is inside */
const inside = ['Fotos', 'Lugares']

export function IntroInside() {
  const navigate = useNavigate()

  const enter = () => {
    markIntroSeen()
    navigate('/archive', { replace: true })
  }

  return (
    <Screen>
      <h1 className="serif text-title text-ink">Qué hay adentro</h1>
      <ul className="serif enter-late mt-8 text-lead text-ink">
        {inside.map((item) => (
          <li key={item} className="border-b border-rule py-3 last:border-b-0">
            {item}
          </li>
        ))}
      </ul>
      <p className="enter-late mt-8 max-w-sm text-ui text-muted">
        Algunas cosas que hemos hecho, lugares donde hemos estado, cosas que me has contado y, con el tiempo, muchas más fotos.
      </p>
      <div className="enter-later mt-14">
        <Button onClick={enter}>
          Continuar <Arrow />
        </Button>
      </div>
    </Screen>
  )
}
