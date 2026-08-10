import { expect, test, type Page, type Route } from '@playwright/test'

const PROJECT_REF = 'othuhgapvnpdjhartrut'
const AUTH_STORAGE_KEY = `odonto-${PROJECT_REF}-auth-v1`
const USER_ID = '11111111-1111-4111-8111-111111111111'
const PACIENTE_ID = '18beb070-5426-47db-8bba-b318f8a06cfd'

const session = {
  access_token: `${btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${btoa(JSON.stringify({ aud: 'authenticated', exp: 4_102_444_800, role: 'authenticated', sub: USER_ID }))}.firma-de-prueba`,
  refresh_token: 'refresh-de-prueba', expires_at: 4_102_444_800, expires_in: 3600, token_type: 'bearer',
  user: { id: USER_ID, aud: 'authenticated', role: 'authenticated', email: 'admin.pruebas@odontologia.local', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00.000Z' },
}

async function responderSupabase(route: Route) {
  const url = new URL(route.request().url())
  if (url.pathname.endsWith('/auth/v1/user')) return route.fulfill({ status: 200, body: JSON.stringify(session.user) })
  if (url.pathname.includes('/auth/v1/token')) return route.fulfill({ status: 200, body: JSON.stringify(session) })
  if (!url.pathname.includes('/rest/v1/')) return route.continue()

  const tabla = url.pathname.split('/').pop()
  const singular = route.request().headers().accept?.includes('application/vnd.pgrst.object+json')
  let data: unknown = []
  if (tabla === 'profiles') data = singular ? { id: USER_ID } : [{ id: USER_ID }]
  if (tabla === 'user_roles') data = [{ user_id: USER_ID, role: 'admin', permissions: {}, status: 'Activo' }]
  if (tabla === 'pacientes') data = {
    id: PACIENTE_ID, nombres: 'Paciente', apellidos: 'Prueba', documento: '1234567', tipo: 'civil', activo: true,
    fecha_nacimiento: null, sexo: 'F', email: null, telefono: null, direccion: null,
  }
  if (tabla === 'medicos') data = []
  await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/0' }, body: JSON.stringify(data) })
}

async function prepararSesion(page: Page) {
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), { key: AUTH_STORAGE_KEY, value: session })
  await page.route(`https://${PROJECT_REF}.supabase.co/**`, responderSupabase)
}

test('la ficha muestra el periodontograma clínico completo', async ({ page }) => {
  await prepararSesion(page)
  await page.goto(`/pacientes/${PACIENTE_ID}`)
  await page.getByRole('tab', { name: /Perio\./ }).click()

  await expect(page.getByText('Superior · vestibular y palatino')).toBeVisible()
  await expect(page.getByText('Inferior · vestibular y lingual')).toBeVisible()
  await expect(page.getByLabel('Pieza 18, sitio mv, profundidad de sondaje')).toBeVisible()
  await expect(page.getByLabel('Pieza 18, sitio mv, margen gingival')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeVisible()
})
