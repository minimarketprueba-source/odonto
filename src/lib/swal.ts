import { showSwal } from "@/components/ui/swal";

export async function showSwalSuccess(message: string) {
  await showSwal({
    icon: 'success',
    title: '¡Éxito!',
    text: message,
    timer: 3000, // Se cierra automáticamente en 3 segundos
    timerProgressBar: true,
    showConfirmButton: false, // No mostrar botón de confirmación
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
}

export async function showSwalError(message: string) {
  await showSwal({
    icon: 'error',
    title: 'Error',
    text: message,
    confirmButtonText: 'Aceptar',
    confirmButtonColor: '#ef4444',
  });
}

export async function showSwalInfo(message: string) {
  await showSwal({
    icon: 'info',
    title: 'Información',
    text: message,
    timer: 4000, // Se cierra automáticamente en 4 segundos
    timerProgressBar: true,
    showConfirmButton: false, // No mostrar botón de confirmación
    allowOutsideClick: false,
    allowEscapeKey: false,
  });
}
