import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL || '/'

export function useData(file) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${BASE}data/${file}.json`)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load ${file}`)
        return r.json()
      })
      .then(d => {
        if (!cancelled) {
          setData(d)
          setLoading(false)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [file])

  return { data, loading, error }
}
