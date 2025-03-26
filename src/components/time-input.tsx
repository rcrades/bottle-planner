"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Input } from "./ui/input"

interface TimeInputProps {
  value: string
  onChange: (value: string) => void
}

export function TimeInput({ value, onChange }: TimeInputProps) {
  const [hours, setHours] = useState("")
  const [minutes, setMinutes] = useState("")

  useEffect(() => {
    if (value) {
      const [h, m] = value.split(":")
      setHours(h)
      setMinutes(m)
    }
  }, [value])

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = e.target.value
    if (/^\d{0,2}$/.test(newHours)) {
      const parsedHours = newHours === "" ? "00" : Number.parseInt(newHours, 10) > 23 ? "23" : newHours.padStart(2, "0")
      setHours(parsedHours)
      onChange(`${parsedHours}:${minutes}`)
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = e.target.value
    if (/^\d{0,2}$/.test(newMinutes)) {
      const parsedMinutes =
        newMinutes === "" ? "00" : Number.parseInt(newMinutes, 10) > 59 ? "59" : newMinutes.padStart(2, "0")
      setMinutes(parsedMinutes)
      onChange(`${hours}:${parsedMinutes}`)
    }
  }

  return (
    <div className="flex items-center">
      <Input
        type="text"
        value={hours}
        onChange={handleHoursChange}
        className="w-16 text-center"
        placeholder="HH"
        maxLength={2}
      />
      <span className="mx-1">:</span>
      <Input
        type="text"
        value={minutes}
        onChange={handleMinutesChange}
        className="w-16 text-center"
        placeholder="MM"
        maxLength={2}
      />
    </div>
  )
}

