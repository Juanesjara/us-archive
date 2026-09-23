import { Screen } from '../components/ui/Screen'
import { LinkButton } from '../components/ui/Button'

/* /one-more-thing */
export function OneMoreThing() {
  return (
    <Screen>
      <p className="serif text-title text-ink">En realidad...</p>
      <p className="serif enter-late mt-4 text-lead text-body">Hay algo que te quería preguntar.</p>
      <div className="enter-later mt-14">
        <LinkButton to="/one-more-thing/look">Continuar</LinkButton>
      </div>
    </Screen>
  )
}

/* /one-more-thing/look. Nothing to tap. The rest happens in person. */
export function LookAtMe() {
  return (
    <Screen>
      <p className="serif text-title text-ink">Pero no por una pantalla.</p>
      <p className="serif enter-late mt-4 text-lead text-body">Mírame.</p>
    </Screen>
  )
}
