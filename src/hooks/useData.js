import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.BASE_URL || '/'

export function useData(file, refreshMs = 0) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isFirstLoadRef = useRef(true)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      fetch(`${BASE}data/${file}.json`)
        .then(r => {
          if (!r.ok) throw new Error(`Failed to load ${file}`)
          return r.json()
        })
        .then(d => {
          if (!cancelled) {
            setData(d)
            setLoading(false)
            setError(null)
          }
        })
        .catch(e => {
          if (!cancelled) {
            setError(e.message)
            setLoading(false)
          }
        })
    }

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false
      setLoading(true)
    }
    load()

    let timer = null
    if (refreshMs > 0) {
      timer = window.setInterval(load, refreshMs)
    }

    return () => {
      cancelled = true
      if (timer) window.clearInterval(timer)
    }
  }, [file, refreshMs])

  return { data, loading, error }
}
