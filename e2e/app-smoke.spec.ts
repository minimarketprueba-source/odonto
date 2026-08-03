import { expect, test, type Page, type Route } from '@playwright/test'

const PROJECT_REF = 'vnkstlvqzkhdfeoqskcf'
const AUTH_STORAGE_KEY = `sanidad-citas-${PROJECT_REF}-auth-v1`
const USER_ID = '11111111-1111-4111-8111-111111111111'

const session = {
  access_token: [
    btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })),
    btoa(
      JSON.stringify({
        aud: 'authenticated',
        exp: 4_102_444_800,
        role: 'authenticated',
        sub: USER_ID,
      })
    ),
    'firma-de-prueba',
  ].join('.'),
  refresh_token: 'refresh-de-prueba',
  expires_at: 4_102_444_800,
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin.pruebas@sanidad-citas.local',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {},
    identities: [],
    created_at: '2026-01-01T00:00:00.000Z',
  },
}

const rutasProtegidas = [
  '/',
  '/pacientes',
  '/citas',
  '/horarios',
  '/enfermeria',
  '/rac',
  '/nutricion',
  '/perfil',
  '/lista-espera',
  '/reportes',
  '/mantenimiento',
  '/usuarios',
]

async function responderSupabase(route: Route) {
  const request = route.request()
  const url = new URL(request.url())
  const method = request.method()

  if (url.pathname.endsWith('/auth/v1/user')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session.user),
    })
    return
  }

  if (url.pathname.includes('/auth/v1/token')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(session),
    })
    return
  }

  if (url.pathname.includes('/functions/v1/')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({}),
    })
    return
  }

  if (!url.pathname.includes('/rest/v1/')) {
    await route.continue()
    return
  }

  const recurso = url.pathname.split('/').pop() ?? ''
  const singular = request.headers().accept?.includes('application/vnd.pgrst.object+json')

  let data: unknown = []
  if (recurso === 'profiles') {
    data = singular ? { id: USER_ID } : [{ id: USER_ID }]
  } else if (recurso === 'user_roles') {
    data = singular
      ? { role: 'admin', permissions: {}, status: 'Activo' }
      : [{ user_id: USER_ID, role: 'admin', permissions: {}, status: 'Activo' }]
  } else if (recurso === 'medicos' && singular) {
    data = {
      id: 1,
      nombres: 'Administrador',
      apellidos: 'Pruebas',
      activo: true,
      user_id: USER_ID,
      especialidad: { id: 1, nombre: 'Medicina General', color: '#2563eb' },
    }
  } else if (recurso === 'list_admin_users') {
    data = []
  }

  const headers = {
    'access-control-allow-origin': '*',
    'content-range': '0-0/0',
  }

  if (method === 'HEAD') {
    await route.fulfill({ status: 200, headers })
    return
  }

  await route.fulfill({
    status: 200,
    headers,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

function vigilarErrores(page: Page) {
  const errores: string[] = []
  page.on('pageerror', (error) => errores.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error') errores.push(`console: ${message.text()}`)
  })
  return errores
}

async function prepararSesion(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: AUTH_STORAGE_KEY,
    value: session,
  })
  await page.route(`https://${PROJECT_REF}.supabase.co/**`, responderSupabase)
}

test.describe('rutas públicas', () => {
  for (const ruta of [
    '/auth/login',
    '/auth/sign-up',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/configurar-supabase',
  ]) {
    test(`${ruta} carga sin romperse`, async ({ page }) => {
      const errores = vigilarErrores(page)
      await page.goto(ruta)
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('#root')).not.toBeEmpty()
      await expect(page.getByText('Algo salió mal')).toHaveCount(0)
      expect(errores).toEqual([])
    })
  }

  test('el formulario de acceso permite completar y mostrar la contraseña', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Correo electrónico').fill('pruebas@sanidad.local')
    const password = page.getByLabel('Contraseña')
    await password.fill('clave-segura')
    await expect(password).toHaveAttribute('type', 'password')
    await page.locator('#password + button').click()
    await expect(password).toHaveAttribute('type', 'text')
  })
})

test.describe('rutas protegidas con sesión simulada', () => {
  test.beforeEach(async ({ page }) => {
    await prepararSesion(page)
  })

  for (const ruta of rutasProtegidas) {
    test(`${ruta} renderiza en escritorio y móvil`, async ({ page }, testInfo) => {
      const errores = vigilarErrores(page)
      await page.goto(ruta)
      await expect(page.locator('main')).toBeVisible({ timeout: 15_000 })
      await expect(page).toHaveURL(new RegExp(`${ruta === '/' ? '/$' : ruta}`))
      await expect(page.getByText('Algo salió mal')).toHaveCount(0)
      await expect(page.getByText('Sin acceso a Sanidad')).toHaveCount(0)

      const ancho = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        contenido: document.documentElement.scrollWidth,
      }))
      expect(ancho.contenido).toBeLessThanOrEqual(ancho.viewport + 1)
      expect(errores).toEqual([])

      const nombre = ruta === '/' ? 'dashboard' : ruta.slice(1).replace(/\//g, '-')
      await page.screenshot({
        path: `test-results/smoke/${testInfo.project.name}-${nombre}.png`,
        fullPage: true,
      })
    })
  }

  for (const caso of [
    { ruta: '/pacientes', boton: 'Registrar paciente' },
    { ruta: '/citas', boton: 'Agendar cita' },
    { ruta: '/rac', boton: 'Nueva ficha' },
    { ruta: '/mantenimiento', boton: 'Registrar médico' },
    { ruta: '/usuarios', boton: 'Nuevo' },
  ]) {
    test(`${caso.ruta} abre su formulario principal`, async ({ page }) => {
      const errores = vigilarErrores(page)
      await page.goto(caso.ruta)
      await page.getByRole('button', { name: caso.boton, exact: true }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(errores).toEqual([])
    })
  }

  test('/enfermeria abre el registro de atención ambulatoria', async ({ page }) => {
    const errores = vigilarErrores(page)
    await page.goto('/enfermeria')
    await page.getByRole('tab', { name: /Atención ambulatoria/ }).click()
    await page.getByRole('button', { name: 'Registrar atención', exact: true }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(errores).toEqual([])
  })
})
