import { LinkButton, Arrow } from '../ui/Button'
import { useDocument } from '../../hooks/useCollection'
import { OFFICIAL_PATH } from '../../services/archive'
import type { OfficialState } from '../../types'

/**
 * The quiet section at the bottom of the archive. Before the question is
 * asked it leads to the "one more thing" screens. After the official state
 * is switched on, it simply closes the page.
 */
export function FinalSection() {
  const { data: official } = useDocument<OfficialState>(OFFICIAL_PATH)

  return (
    <section className="mt-32 border-t border-rule pt-16">
      <p className="serif text-lead text-ink">Eso es todo.</p>
      {official?.active ? null : (
        <>
          <p className="serif mt-1 text-lead text-muted">O... casi.</p>
          <div className="mt-8">
            <LinkButton to="/one-more-thing" variant="quiet">
              Una cosa más <Arrow />
            </LinkButton>
          </div>
        </>
      )}
    </section>
  )
}
