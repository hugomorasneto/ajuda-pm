import { useCallback, useEffect, useState } from 'react'
import {
  getCompletedGuides,
  markGuideCompleted,
  unmarkGuideCompleted,
} from '../services/learningProgressService'
import { useAuth } from './useAuth'

export function useLearningProgress() {
  const { user } = useAuth()
  const [completedSlugs, setCompletedSlugs] = useState(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      setCompletedSlugs(new Set())
      return
    }

    let active = true
    setIsLoading(true)

    getCompletedGuides(user.id).then(({ data }) => {
      if (!active) return
      setCompletedSlugs(new Set(data.map((r) => r.guide_slug)))
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [user])

  const markCompleted = useCallback(
    async (slug) => {
      if (!user) return
      // optimistic update
      setCompletedSlugs((prev) => new Set([...prev, slug]))
      const { success } = await markGuideCompleted(user.id, slug)
      if (!success) {
        // revert on failure
        setCompletedSlugs((prev) => {
          const next = new Set(prev)
          next.delete(slug)
          return next
        })
      }
    },
    [user],
  )

  const unmarkCompleted = useCallback(
    async (slug) => {
      if (!user) return
      // optimistic update
      setCompletedSlugs((prev) => {
        const next = new Set(prev)
        next.delete(slug)
        return next
      })
      const { success } = await unmarkGuideCompleted(user.id, slug)
      if (!success) {
        // revert on failure
        setCompletedSlugs((prev) => new Set([...prev, slug]))
      }
    },
    [user],
  )

  const isCompleted = useCallback(
    (slug) => completedSlugs.has(slug),
    [completedSlugs],
  )

  return { isCompleted, markCompleted, unmarkCompleted, isLoading, completedSlugs }
}
