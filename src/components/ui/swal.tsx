"use client"
import { useCallback } from "react"
import type { SweetAlertOptions } from "sweetalert2"
import "@/styles/components/swal.css"

let Swal: any = null
let loadAttempted = false

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureSwal() {
  if (Swal) return Swal

  const tryLoad = async (): Promise<any> => {
    const mod = await import("sweetalert2")
    let s = mod.default ?? mod
    // Configuración global para mejorar accesibilidad
    if (s.mixin) {
      s = s.mixin({
        allowEscapeKey: true,
        focusConfirm: true,
        returnFocus: true,
        heightAuto: false,
        backdrop: true,
        showCloseButton: true,
        didOpen: () => {
          const confirmButton = document.querySelector('.swal2-confirm') as HTMLElement
          if (confirmButton) {
            confirmButton.focus()
          }
        },
        willClose: () => {
          const rootElement = document.getElementById('root')
          if (rootElement && rootElement.getAttribute('aria-hidden') === 'true') {
            rootElement.removeAttribute('aria-hidden')
          }
        }
      })
    }
    return s
  }

  if (!loadAttempted) {
    loadAttempted = true
    try {
      Swal = await tryLoad()
      return Swal
    } catch (firstErr) {
      // Retry una vez tras breve espera (útil para errores de red transitorios)
      await sleep(300)
      try {
        Swal = await tryLoad()
        return Swal
      } catch (secondErr) {
        console.warn("[swal] Failed to load sweetalert2 after retry:", secondErr)
      }
    }
  }

  // Fallback: devolver un mock mínimo que no rompa los callers
  const noopSwal = {
    fire: async (opts: SweetAlertOptions) => {
      const title = typeof opts.title === "string" ? opts.title : "Alerta"
      const text = typeof opts.text === "string" ? opts.text : ""
      // Intentar usar alert nativo como último recurso
      if (typeof window !== "undefined" && window.alert) {
        window.alert(`${title}\n\n${text}`)
      }
      return {
        isConfirmed: true,
        isDenied: false,
        isDismissed: false,
        value: true,
      }
    },
  }
  return noopSwal
}

export function useSwal() {
  const show = useCallback(async (options: SweetAlertOptions) => {
    const s = await ensureSwal()
    return s.fire({
      ...options,
      customClass: {
        container: `swal2-overflow-auto ${options.customClass?.container ?? ""}`.trim(),
        popup: `swal2-scroll-body ${options.customClass?.popup ?? ""}`.trim(),
        ...options.customClass,
      },
      focusConfirm: options.focusConfirm ?? false,
      allowOutsideClick: options.allowOutsideClick ?? true,
      allowEscapeKey: options.allowEscapeKey ?? true,
      showCloseButton: options.showCloseButton ?? true,
    })
  }, [])

  const success = useCallback(
    (title = "Hecho", text?: string) =>
      show({ icon: "success", title, text, confirmButtonText: "OK" }),
    [show]
  )

  const error = useCallback(
    (title = "Error", text?: string) =>
      show({ icon: "error", title, text, confirmButtonText: "Cerrar" }),
    [show]
  )

  const confirm = useCallback(
    (title: string, text?: string, confirmText = "Confirmar", cancelText = "Cancelar") =>
      show({
        icon: "warning",
        title,
        text,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        focusConfirm: false,
        focusCancel: true
      }),
    [show]
  )

  return { show, success, error, confirm }
}

export async function showSwal(options: SweetAlertOptions) {
  const s = await ensureSwal()

  const blockInteractions = (popup: HTMLElement) => {
    const listeners: Array<{ target: EventTarget; type: string; handler: EventListenerOrEventListenerObject }> = []
    const eventTypes = [
      "pointerdown",
      "pointerup",
      "mousedown",
      "mouseup",
      "click",
      "touchstart",
      "touchend",
    ]

    const stopOverlayEvents = (event: Event) => {
      const target = event.target
      if (target && popup.contains(target as Node)) {
        return
      }
      event.stopPropagation()
      event.preventDefault()
    }

    const add = (target: EventTarget | null, type: string) => {
      if (!target) return
      target.addEventListener(type, stopOverlayEvents, true)
      listeners.push({ target, type, handler: stopOverlayEvents })
    }

    const container = popup.closest(".swal2-container")
    eventTypes.forEach((type) => add(container, type))

    return () => {
      listeners.forEach(({ target, type, handler }) => {
        try {
          target.removeEventListener(type, handler, true)
        } catch {
          // ignore
        }
      })
    }
  }

  const customClasses = {
    container: `swal2-overflow-auto ${options.customClass?.container ?? ""}`.trim(),
    popup: `swal2-scroll-body ${options.customClass?.popup ?? ""}`.trim(),
    ...options.customClass,
  }

  const baseOptions: SweetAlertOptions = {
    allowOutsideClick: options.allowOutsideClick ?? true,
    allowEscapeKey: true,
    focusConfirm: true,
    focusDeny: false,
    focusCancel: false,
    returnFocus: true,
    showCloseButton: options.showCloseButton ?? true,
    confirmButtonText: options.confirmButtonText ?? "Entendido",
    customClass: customClasses,
  }

  const combinedOptions = {
    ...baseOptions,
    ...options,
    customClass: customClasses,
  }

  const cleanupStack: Array<() => void> = []

  const callDidOpen = combinedOptions.didOpen
  const callWillClose = combinedOptions.willClose

  combinedOptions.didOpen = (popup) => {
    cleanupStack.push(blockInteractions(popup))
    if (callDidOpen) {
      callDidOpen(popup)
    }
  }

  combinedOptions.willClose = (popup) => {
    cleanupStack.splice(0).forEach((fn) => fn())
    if (callWillClose) {
      callWillClose(popup)
    }
  }

  return s.fire(combinedOptions)
}

export default useSwal
