import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const MAX_HASH_SCROLL_ATTEMPTS = 20

function getHashElement(hash) {
  if (!hash) return null

  const rawId = hash.startsWith('#') ? hash.slice(1) : hash
  if (!rawId) return null

  let id = rawId
  try {
    id = decodeURIComponent(rawId)
  } catch {
    id = rawId
  }

  return document.getElementById(id)
}

function scrollToTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  } catch {
    window.scrollTo(0, 0)
  }
}

function scrollToElement(element) {
  try {
    element.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' })
  } catch {
    element.scrollIntoView()
  }
}

function ScrollRestoration() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return undefined

    const originalScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'

    return () => {
      window.history.scrollRestoration = originalScrollRestoration
    }
  }, [])

  useEffect(() => {
    let frameId = 0
    let attempts = 0

    function restoreScroll() {
      if (!hash) {
        scrollToTop()
        return
      }

      const element = getHashElement(hash)
      if (element) {
        scrollToElement(element)
        return
      }

      attempts += 1
      if (attempts < MAX_HASH_SCROLL_ATTEMPTS) {
        frameId = window.requestAnimationFrame(restoreScroll)
        return
      }

      scrollToTop()
    }

    frameId = window.requestAnimationFrame(restoreScroll)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [pathname, hash])

  return null
}

export default ScrollRestoration
