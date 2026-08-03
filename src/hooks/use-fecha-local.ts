import { useMemo } from 'react'

export function useFechaLocal() {
    return useMemo(() => {
        const d = new Date()
        const fechaLarga = new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: 'long', year: 'numeric' }).format(d)
        const diaSemana = new Intl.DateTimeFormat('es-PY', { weekday: 'long' }).format(d)
        const fechaCorta = new Intl.DateTimeFormat('es-PY', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
        return { fechaLarga, fechaCortaStr: `${diaSemana} ${fechaCorta}` }
    }, [])
}
