declare module 'sweetalert2' {
  type SweetAlertIcon = 'success' | 'error' | 'warning' | 'info' | 'question'

  export interface SweetAlertOptions {
    title?: string
    text?: string
    html?: string
    icon?: SweetAlertIcon
    confirmButtonText?: string
    showConfirmButton?: boolean
    timer?: number
    timerProgressBar?: boolean
    position?: 'top' | 'top-start' | 'top-end' | 'center' | 'center-start' | 'center-end' | 'bottom' | 'bottom-start' | 'bottom-end'
    toast?: boolean
    [key: string]: any
  }

  export function fire(options: SweetAlertOptions): Promise<any>

  const Swal: {
    fire: (options: SweetAlertOptions) => Promise<any>
  }

  export default Swal
}
