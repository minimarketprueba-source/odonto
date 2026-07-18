import { useEffect, useRef, MutableRefObject } from 'react'

interface UseIntersectionObserverProps {
  threshold?: number
  root?: Element | null
  rootMargin?: string
  onIntersect: () => void
}

export function useIntersectionObserver({
  threshold = 0.1,
  root = null,
  rootMargin = '0px',
  onIntersect,
}: UseIntersectionObserverProps): MutableRefObject<HTMLDivElement | null> {
  const targetRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onIntersect()
          }
        })
      },
      {
        threshold,
        root,
        rootMargin,
      }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [threshold, root, rootMargin, onIntersect])

  return targetRef
}

export function useInfiniteScroll(
  callback: () => void,
  options?: Omit<UseIntersectionObserverProps, 'onIntersect'>
) {
  return useIntersectionObserver({
    ...options,
    onIntersect: callback,
  })
}
