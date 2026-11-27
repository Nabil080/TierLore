// `from` tells the survey's answers from this site apart from the others
const SURVEY_HREF = 'https://beta.tierlore.com/survey?from=tierlore-com'

export function PrototypeBanner() {
  return (
    <aside className="prototype-banner">
      <p>This site is only a <strong>prototype</strong>. The full version of TierLore is in development: tell me what you think to shape it.</p>
      <a href={SURVEY_HREF} target="_blank" rel="noopener">Take the survey</a>
    </aside>
  )
}
