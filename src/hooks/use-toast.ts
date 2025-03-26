"use client"

// Adapted from https://ui.shadcn.com/docs/components/toast
import { useState, useEffect, type ReactNode } from "react"

type ToastProps = {
  id?: string
  title?: string
  description?: ReactNode
  action?: ReactNode
  variant?: "default" | "destructive"
}

type ToastState = {
  toasts: ToastProps[]
}

const TOAST_TIMEOUT = 5000

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  useEffect(() => {
    const timer = setTimeout(() => {
      setState((state) => ({
        toasts: state.toasts.slice(1),
      }))
    }, TOAST_TIMEOUT)

    return () => clearTimeout(timer)
  }, [state.toasts.length])

  function toast(props: ToastProps) {
    const id = Math.random().toString(36).substring(2, 9)
    setState((state) => ({
      toasts: [...state.toasts, { id, ...props }],
    }))
    return id
  }

  function dismiss(id?: string) {
    setState((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }))
  }

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  }
}

