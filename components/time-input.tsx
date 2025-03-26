import React from 'react'
import { Input } from './ui/input'

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export const TimeInput: React.FC<TimeInputProps> = ({ value, onChange, className }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    // Ensure the time format is valid (HH:mm)
    if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newValue) || newValue === '') {
      onChange(newValue)
    }
  }

  return (
    <Input
      type="time"
      value={value}
      onChange={handleChange}
      className={className}
      step="300" // 5-minute intervals
    />
  )
} 