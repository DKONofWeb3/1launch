'use client'

import { IconBSC, IconSolana } from '@/components/ui/Icons'

type Chain = 'bsc' | 'solana'

interface ChainSelectorProps {
  value: Chain
  onChange: (chain: Chain) => void
}

const CHAINS = [
  {
    id: 'bsc' as Chain,
    label: 'BNB Smart Chain',
    tag: 'BSC',
    fee: '$15',
    icon: <IconBSC size={20} />,
    color: '#F3BA2F',
  },
  {
    id: 'solana' as Chain,
    label: 'Solana',
    tag: 'SOL',
    fee: '$9',
    icon: <IconSolana size={20} />,
    color: '#9945FF',
  },
]

export function ChainSelector({ value, onChange }: ChainSelectorProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 10, fontWeight: 600,
        color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        Deploy Chain
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {CHAINS.map((chain) => {
          const selected = value === chain.id
          return (
            <button
              key={chain.id}
              onClick={() => onChange(chain.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px',
                background: selected ? `${chain.color}12` : '#0E0E16',
                border: `1.5px solid ${selected ? chain.color : '#1E1E2E'}`,
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'left',
              }}
            >
              {chain.icon}
              <div>
                <div style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 12, fontWeight: 700,
                  color: selected ? chain.color : '#F9FAFB',
                }}>
                  {chain.tag}
                </div>
                <div style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: 10, color: '#6B7280', marginTop: 1,
                }}>
                  Deploy fee: {chain.fee}
                </div>
              </div>
              {selected && (
                <div style={{ marginLeft: 'auto' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke={chain.color} strokeWidth="1.5"/>
                    <path d="M5 8l2 2 4-4" stroke={chain.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
