'use client'

interface Step {
  number: number
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  current: number
}

export function StepIndicator({ steps, current }: StepIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {steps.map((step, i) => {
        const done = step.number < current
        const active = step.number === current

        return (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Step dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done ? '#00FF88' : active ? 'rgba(0,255,136,0.12)' : '#1E1E2E',
                border: `1.5px solid ${done ? '#00FF88' : active ? '#00FF88' : '#2A2A3E'}`,
                transition: 'all 0.3s',
                flexShrink: 0,
              }}>
                {done ? (
                  // Checkmark
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#0A0A0F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: 11,
                    fontWeight: 700,
                    color: active ? '#00FF88' : '#4B5563',
                  }}>
                    {step.number}
                  </span>
                )}
              </div>
              <span style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: 10,
                color: active ? '#00FF88' : done ? '#6B7280' : '#374151',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                transition: 'color 0.3s',
              }}>
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div style={{
                width: 48,
                height: 1.5,
                background: done ? '#00FF88' : '#1E1E2E',
                marginBottom: 22,
                transition: 'background 0.3s',
                flexShrink: 0,
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
