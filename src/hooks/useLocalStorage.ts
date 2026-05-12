import { useState, useCallback } from 'react'

/**
 * Drop-in useState replacement that automatically syncs to localStorage.
 * Data survives page refresh. Key should be unique per feature.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const next = value instanceof Function ? value(prev) : value
        try {
          window.localStorage.setItem(key, JSON.stringify(next))
        } catch (e) {
          console.warn(`[useLocalStorage] Could not save key "${key}":`, e)
        }
        return next
      })
    },
    [key]
  )

  return [storedValue, setValue]
}
