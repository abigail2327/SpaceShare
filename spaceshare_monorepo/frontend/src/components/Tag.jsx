export default function Tag({ children, tone = 'neutral', icon }) {
  const tones = {
    neutral: 'bg-sand text-ink/75 border-line',
    gold: 'bg-goldlight text-[#7A5C17] border-gold/40',
    forest: 'bg-forestlight text-forest border-forest/25',
    clay: 'bg-claylight text-clay border-clay/30',
    outline: 'bg-white text-ink/55 border-line',
    dark: 'bg-ink text-paper border-ink',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium leading-none ${
        tones[tone] || tones.neutral
      }`}
    >
      {icon ? (
        <span className="shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      ) : (
        <span className="h-1.5 w-1.5 shrink-0 rotate-45 rounded-[2px] bg-current opacity-70" />
      )}
      {children}
    </span>
  )
}
