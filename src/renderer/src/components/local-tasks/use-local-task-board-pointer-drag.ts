import { useCallback, useRef } from 'react'
import type { LocalTaskStatus } from '../../../../shared/local-task-types'

const DRAG_THRESHOLD = 5
const HIGHLIGHT_CLASS = 'ring-1'
const HIGHLIGHT_RING_CLASS = 'ring-ring/70'
const HIGHLIGHT_BORDER_CLASS = 'border-ring/70'
const DRAGGING_CARD_CLASS = 'opacity-40'

type CachedColumn = {
  status: LocalTaskStatus
  element: HTMLElement
  left: number
  right: number
  top: number
  bottom: number
}

type DragState = {
  pointerId: number
  taskId: string
  startX: number
  startY: number
  offsetX: number
  offsetY: number
  currentX: number
  currentY: number
  sourceCard: HTMLElement
  preview: HTMLElement | null
  started: boolean
  columns: CachedColumn[]
  frameId: number | null
  highlightedEl: HTMLElement | null
  activeStatus: LocalTaskStatus | null
}

type ColumnRef = { status: LocalTaskStatus; element: HTMLElement }

export function useLocalTaskBoardPointerDrag({
  onUpdateStatus
}: {
  onUpdateStatus: (taskId: string, status: LocalTaskStatus) => void
}): {
  registerColumn: (status: LocalTaskStatus, el: HTMLElement | null) => void
  onCardPointerDown: (taskId: string, e: React.PointerEvent) => void
} {
  const dragRef = useRef<DragState | null>(null)
  const columnsRef = useRef<ColumnRef[]>([])
  const onUpdateStatusRef = useRef(onUpdateStatus)
  onUpdateStatusRef.current = onUpdateStatus

  const registerColumn = useCallback((status: LocalTaskStatus, el: HTMLElement | null) => {
    columnsRef.current = columnsRef.current.filter((c) => c.status !== status)
    if (el) {
      columnsRef.current.push({ status, element: el })
    }
  }, [])

  const onCardPointerDown = useCallback((taskId: string, e: React.PointerEvent) => {
    if (e.button !== 0) {
      return
    }

    const card = e.currentTarget as HTMLElement
    const rect = card.getBoundingClientRect()

    dragRef.current = {
      pointerId: e.pointerId,
      taskId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      currentX: e.clientX,
      currentY: e.clientY,
      sourceCard: card,
      preview: null,
      started: false,
      columns: [],
      frameId: null,
      highlightedEl: null,
      activeStatus: null
    }

    const flushFrame = (): void => {
      const state = dragRef.current
      if (!state) {
        return
      }
      state.frameId = null
      if (!state.started || !state.preview) {
        return
      }

      state.preview.style.setProperty(
        'transform',
        `translate3d(${state.currentX - state.offsetX}px,${state.currentY - state.offsetY}px,0)`
      )

      let hitCol: CachedColumn | null = null
      for (const c of state.columns) {
        if (
          state.currentX >= c.left &&
          state.currentX <= c.right &&
          state.currentY >= c.top &&
          state.currentY <= c.bottom
        ) {
          hitCol = c
          break
        }
      }

      const hitEl = hitCol?.element ?? null
      if (hitEl !== state.highlightedEl) {
        if (state.highlightedEl) {
          state.highlightedEl.classList.remove(
            HIGHLIGHT_CLASS,
            HIGHLIGHT_RING_CLASS,
            HIGHLIGHT_BORDER_CLASS
          )
        }
        if (hitEl) {
          hitEl.classList.add(HIGHLIGHT_CLASS, HIGHLIGHT_RING_CLASS, HIGHLIGHT_BORDER_CLASS)
        }
        state.highlightedEl = hitEl
      }
      state.activeStatus = hitCol?.status ?? null
    }

    const scheduleFrame = (state: DragState): void => {
      if (state.frameId !== null) {
        return
      }
      state.frameId = window.requestAnimationFrame(flushFrame)
    }

    const handlePointerMove = (ev: PointerEvent): void => {
      const state = dragRef.current
      if (!state || ev.pointerId !== state.pointerId) {
        return
      }

      state.currentX = ev.clientX
      state.currentY = ev.clientY

      if (!state.started) {
        const distance = Math.hypot(ev.clientX - state.startX, ev.clientY - state.startY)
        if (distance < DRAG_THRESHOLD) {
          return
        }
        state.started = true
        state.columns = columnsRef.current.map((c) => {
          const r = c.element.getBoundingClientRect()
          return {
            status: c.status,
            element: c.element,
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom
          }
        })
        document.body.style.cursor = 'grabbing'
        document.body.style.userSelect = 'none'
        state.sourceCard.classList.add(DRAGGING_CARD_CLASS)
        state.preview = createDragPreview(state.sourceCard, rect)
      }

      ev.preventDefault()
      scheduleFrame(state)
    }

    const handlePointerUp = (ev: PointerEvent): void => {
      const state = dragRef.current
      if (!state || ev.pointerId !== state.pointerId) {
        return
      }

      document.removeEventListener('pointermove', handlePointerMove, true)
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''

      if (state.frameId !== null) {
        window.cancelAnimationFrame(state.frameId)
      }
      if (state.preview) {
        state.preview.remove()
      }
      state.sourceCard.classList.remove(DRAGGING_CARD_CLASS)
      if (state.highlightedEl) {
        state.highlightedEl.classList.remove(
          HIGHLIGHT_CLASS,
          HIGHLIGHT_RING_CLASS,
          HIGHLIGHT_BORDER_CLASS
        )
      }

      if (state.started && state.activeStatus) {
        onUpdateStatusRef.current(state.taskId, state.activeStatus)
      }

      dragRef.current = null
    }

    document.addEventListener('pointermove', handlePointerMove, true)
    document.addEventListener('pointerup', handlePointerUp, true)
  }, [])

  return { registerColumn, onCardPointerDown }
}

function createDragPreview(sourceCard: HTMLElement, rect: DOMRect): HTMLElement {
  const preview = sourceCard.cloneNode(true) as HTMLElement
  preview.setAttribute('aria-hidden', 'true')
  preview.style.cssText = `position:fixed;left:0;top:0;width:${rect.width}px;pointer-events:none;z-index:2147483647;opacity:.9;box-shadow:0 8px 24px rgba(0,0,0,.18);border-radius:var(--radius);will-change:transform;transform:translate3d(${rect.left}px,${rect.top}px,0)`
  document.body.appendChild(preview)
  return preview
}
