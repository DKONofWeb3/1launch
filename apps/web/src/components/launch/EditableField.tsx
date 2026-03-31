'use client'

import { useState } from 'react'

interface EditableFieldProps {
  label: string
  value: string
  onChange: (val: string) => void
  multiline?: boolean
  maxLength?: number
  prefix?: string
  mono?: boolean
  uppercase?: boolean
}

export function EditableField({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  prefix,
  mono = true,
  uppercase = false,
}: EditableFieldProps) {
  const [focused, setFocused] = useState(false)

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: focused ? '#0A0A0F' : '#0E0E16',
    border: `1px solid ${focused ? '#00FF88' : '#1E1E2E'}`,
    borderRadius: 6,
    padding: prefix ? '8px 10px 8px 28px' : '8px 10px',
    fontFamily: mono ? 'IBM Plex Mono, monospace' : 'Syne, sans-serif',
    fontSize: 13,
    fontWeight: mono ? 500 : 700,
    color: uppercase ? '#00FF88' : '#F9FAFB',
    letterSpacing: uppercase ? '0.08em' : '0.01em',
    textTransform: uppercase ? 'uppercase' : 'none',
    outline: 'none',
    resize: multiline ? 'vertical' : 'none',
    transition: 'border-color 0.15s, background 0.15s',
    lineHeight: 1.6,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          {label}
        </label>
        {maxLength && (
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 10,
            color: value.length > maxLength * 0.9 ? '#FF9500' : '#374151',
          }}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 13, fontWeight: 700, color: '#4B5563',
            pointerEvents: 'none',
          }}>
            {prefix}
          </span>
        )}

        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={maxLength}
            rows={3}
            style={inputStyle}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            maxLength={maxLength}
            style={inputStyle}
          />
        )}
      </div>
    </div>
  )
}
