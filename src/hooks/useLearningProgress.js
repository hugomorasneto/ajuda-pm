import { useCallback, useEffect, useState } from 'react'
import {
  getCompletedGuides,
  markGuideCompleted,
  unmarkGuideCompleted,
} from '../services/learningProgressService'
import { useAuth } from './useAuth'

const EMPTY_COMPLETED_SLUGS = new Set()

export function useLearningProgress() {
  const { user } = useAuth()
  const [completedSlugs, setCompletedSlugs] = useState(EMPTY_COMPLETED_SLUGS)
  const [loadedUserId, setLoadedUserId] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    let active = true

    getCompletedGuides(user.id).then(({ data }) => {
      if (!active) return

      setCompletedSlugs(new Set(data.map((row) => row.guide_slug)))
      setLoadedUserId(user.id)
    })

    return () => {
      active = false
    }
  }, [user])

  const resolvedCompletedSlugs =
    user && loadedUserId === user.id ? completedSlugs : EMPTY_COMPLETED_SLUGS
  const isLoading = Boolean(user && loadedUserId !== user.id)

  const markCompleted = useCallback(
    async (slug) => {
      if (!user) return

      setLoadedUserId(user.id)
      setCompletedSlugs((previous) => new Set([...previous, slug]))

      const { success } = await markGuideCompleted(user.id, slug)
      if (!success) {
        setCompletedSlugs((previous) => {
          const next = new Set(previous)
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

      setLoadedUserId(user.id)
      setCompletedSlugs((previous) => {
        const next = new Set(previous)
        next.delete(slug)
        return next
      })

      const { success } = await unmarkGuideCompleted(user.id, slug)
      if (!success) {
        setCompletedSlugs((previous) => new Set([...previous, slug]))
      }
    },
    [user],
  )

  const isCompleted = useCallback(
    (slug) => resolvedCompletedSlugs.has(slug),
    [resolvedCompletedSlugs],
  )

  return {
    isCompleted,
    markCompleted,
    unmarkCompleted,
    isLoading,
    completedSlugs: resolvedCompletedSlugs,
  }
}
