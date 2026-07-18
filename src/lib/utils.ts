import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateDisplay(
  dateString?: string | null,
  locale: string | string[] = 'es-ES',
  options: Intl.DateTimeFormatOptions = {}
) {
  if (!dateString) {
    return ''
  }

  const parts = dateString.split('-').map((part) => Number(part))
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return dateString
  }

  const [year, month, day] = parts
  const date = new Date(year, month - 1, day)

  try {
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch (error) {
    return dateString
  }
}

export function normalizeText(text: string): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}
