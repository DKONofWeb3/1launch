'use client'

interface HypeMeterProps {
  score: number
  size?: number
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#FF3B3B'
  if (score >= 60) return '#FF9500'
  if (score >= 40) return '#00FF88'
  return '#4B5563'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'NUKE'
  if (score >= 60) return 'HOT'
  if (score >= 40) return 'WARM'
  return 'COLD'
}

export function HypeMeter({ score, size = 72 }: HypeMeterProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 7
  const circumference = 2 * Math.PI * r

  // 270 degree arc (0.75 of full circle)
  const arcFraction = 0.75
  const arcLength = circumference * arcFraction
  const fillLength = arcLength * Math.max(0, Math.min(score, 100)) / 100

  const color = getScoreColor(score)
  const label = getScoreLabel(score)

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(135deg)', display: 'block' }}
      >
        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1E1E2E"
          strokeWidth="5"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {/* Score fill */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeDasharray={`${fillLength} ${circumference}`}
          strokeLinecap="round"
          style={{
            filter: score >= 40 ? `drop-shadow(0 0 5px ${color}90)` : 'none',
            transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </svg>

      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        paddingBottom: size * 0.08,
      }}>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: size * 0.24,
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}>
          {score}
        </span>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: size * 0.11,
          fontWeight: 600,
          color: '#4B5563',
          letterSpacing: '0.08em',
          lineHeight: 1,
          marginTop: 2,
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}
