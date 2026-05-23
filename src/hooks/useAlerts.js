import { useMemo } from 'react'
import { useData } from './useData'

const STORAGE_KEY = 'custom_alerts'

export function readCustomAlerts() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function useAlerts() {
  const { data: alerts, loading, error } = useData('alerts')

  const mergedAlerts = useMemo(() => {
    const customAlerts = readCustomAlerts()
    return [...customAlerts, ...alerts].sort((a, b) => {
      const aTime = new Date(a.timestamp || 0).getTime()
      const bTime = new Date(b.timestamp || 0).getTime()
      return bTime - aTime
    })
  }, [alerts])

  return {
    alerts: mergedAlerts,
    loading,
    error
  }
}
