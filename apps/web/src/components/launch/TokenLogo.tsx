'use client'

import { useState } from 'react'
import Image from 'next/image'

interface TokenLogoProps {
  url: string | null
  name: string
  size?: number
}

export function TokenLogo({ url, name, size = 96 }: TokenLogoProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.2,
      overflow: 'hidden',
      border: '2px solid #1E1E2E',
      background: '#0E0E16',
      position: 'relative',
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {url && !error ? (
        <>
          {!loaded && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, #1E1E2E 25%, #252535 50%, #1E1E2E 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          )}
          <img
            src={url}
            alt={name}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s',
            }}
          />
        </>
      ) : (
        <span style={{
          fontFamily: 'Syne, sans-serif',
          fontSize: size * 0.3,
          fontWeight: 800,
          color: '#00FF88',
          letterSpacing: '-0.02em',
        }}>
          {initials}
        </span>
      )}
    </div>
  )
}
