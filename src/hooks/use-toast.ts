"use client"

// Adapted from https://ui.shadcn.com/docs/components/toast
import * as React from "react"

import type {
  ToastProps,
} from "@radix-ui/react-toast"

// Define the ToastActionElement type locally since it's not exported from '@radix-ui/react-toast'
type ToastActionElement = React.ReactElement<{
  altText: string;
  onClick: () => void;
}>

const TOAST_LIMIT = 1
// Default remove delay is quite short, let's increase it
const TOAST_REMOVE_DELAY = 5000 // 5 seconds for normal toasts
const ERROR_TOAST_REMOVE_DELAY = 10000 // 10 seconds for error toasts

type ToasterToast = ToastProps & {
  id: string
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
  duration?: number // Add custom duration option
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
      id: string
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: string
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: string
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string, duration?: number) => {
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId))
    toastTimeouts.delete(toastId)
  }

  // Use custom duration if provided, or default based on variant
  const toastDuration = duration || TOAST_REMOVE_DELAY

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, toastDuration)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId)
        // Use custom duration or default based on variant
        const duration = toast?.duration || 
          (toast?.variant === "destructive" ? ERROR_TOAST_REMOVE_DELAY : TOAST_REMOVE_DELAY)
        addToRemoveQueue(toastId, duration)
      } else {
        state.toasts.forEach((toast) => {
          // Use custom duration or default based on variant
          const duration = toast.duration || 
            (toast.variant === "destructive" ? ERROR_TOAST_REMOVE_DELAY : TOAST_REMOVE_DELAY)
          addToRemoveQueue(toast.id, duration)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  // Determine duration based on variant
  const duration = props.duration || 
    (props.variant === "destructive" ? ERROR_TOAST_REMOVE_DELAY : TOAST_REMOVE_DELAY)

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      id,
      toast: props,
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      duration,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

// Convenience method for showing error toasts
toast.error = (props: Omit<Toast, "variant">) => {
  return toast({
    ...props,
    variant: "destructive",
    duration: props.duration || ERROR_TOAST_REMOVE_DELAY,
  })
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }

