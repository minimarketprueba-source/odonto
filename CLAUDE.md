# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

> **El usuario prefiere respuestas en español. No es programador**: espera que Claude implemente, pruebe y publique los cambios por él, con explicaciones claras y sin jerga. Trabaja también desde el celular.

**CONSULTORIO ODONTOLÓGICO MOVA DENT** — sistema de gestión dental: pacientes, odontograma, periodontograma, agenda, presupuestos, pagos, recetas y reportes. SPA React desplegada en Vercel sobre Supabase.

**El nombre y los datos del consultorio salen de la base** (tabla `clinicas`) y se editan en Mantenimiento → Consultorio. Antes estaban escritos a mano en 13 lugares y cambiarlos obligaba a encontrarlos todos. No volver a escribir el nombre literal en ningún archivo:

- En componentes de React: `useEmpresa()` de `src/api/empresa.ts`.
- En código que no es React (los impresos): `getEmpresa()` de `src/lib/clinica.ts`.
- `EMPRESA_PREDETERMINADA` es solo el respaldo mientras la consulta no contestó.

**Es odontología pura.** Nació como clon de un sistema médico policial (Sanidad ISEPOL) que a su vez venía de otro de control de peso, y arrastra restos de ambos. Cuando aparezca algo de enfermería, reposos, cadetes, salvoconductos o urgencias: **es herencia, no funcionalidad**. El usuario lo confirmó expresamente el 2026-08-05.

---

## Estado actual (2026-08-05) — LEER PRIMERO

### Dónde está todo

- **App en vivo**: https://odonto-pied.vercel.app
- **Base de datos**: proyecto Supabase `othuhgapvnpdjhartrut` (URL y anon key por defecto en `src/lib/supabase.ts`; no hacen falta variables de entorno en Vercel).
- **Repositorios** — hay **dos**, y hay que empujar a los dos:
  - `Hmoreno2023/odonto` → **es el que despliega Vercel** (remoto `vercel`)
  - `minimarketprueba-source/odonto` → remoto `origin`
- **Proyecto en Vercel**: `minimarketprueba-2203s-projects/odonto`.

### Cuentas

| Correo | Rol |
|---|---|
| `medico@odonto.com` | Odontólogo |
| `admin@odonto.com` | Administrador |
| `recepcion@odonto.com` | Recepción |
| `asistente@odonto.com` | Asistente dental |

**Las contraseñas ya no son las de prueba.** El 2026-08-05 se cambiaron por API admin y se le pasaron al usuario por chat; la de admin la cambió él antes. **No van en este archivo**: es un repositorio de GitHub. Si hace falta reponer una, se resetea por API admin con la service_role key (se la pide al usuario, no se guarda en ningún archivo).

**Registro público**: cerrado por los dos lados. En la app (sin enlace, y `/auth/sign-up` redirige al login) y en Supabase. Verificado el 2026-08-06 sin tocar nada:

```bash
curl -s "https://othuhgapvnpdjhartrut.supabase.co/auth/v1/settings" -H "apikey: <anon key>"
# disable_signup: true   → cerrado
# mailer_autoconfirm: false → la confirmación de correo sigue pedida
```

Ese endpoint es la forma de comprobar la configuración de autenticación sin abrir el panel y sin crear ninguna cuenta de prueba.

**Las cuentas nuevas se crean con la Edge Function `create-user`**, que las marca como confirmadas (`email_confirm: true`). Por eso la confirmación de correo, que sigue activada, ya no traba nada: los correos son de un dominio inventado (`@odonto.com`) y el mail nunca llegaría.

### Datos cargados (2026-08-05)

3 pacientes reales, 8 especialidades odontológicas, 1 clínica, **32 tarifas propias de la clínica** (cargadas por la usuaria el 2026-08-05), 3 sillones. **0 odontólogos**: el usuario todavía no cargó su ficha, y de eso dependen la firma de la agenda y de los registros.

### Migraciones (`supabase/migrations/`)

Se aplican pegándolas en el SQL Editor del panel de Supabase; todas son idempotentes.

| Archivo | Qué hace | Estado |
|---|---|---|
| `base_schema.sql`, `odontologia_setup.sql`, `dentalink_upgrade.sql` | Tablas clínicas dentales | Aplicadas |
| `auth_roles_setup.sql` | `profiles`, `user_roles`, RLS y `es_odonto_admin()` | Aplicada |
| `esquema_completo.sql` | Columnas y tablas que el código pedía y no existían | Aplicada |
| `rls_completo.sql` | Permisos de acceso a los datos | Aplicada |
| `recetas.sql` | `recetas` + `receta_items`, correlativo único y `es_odonto_prescriptor()` | Aplicada 2026-08-06 |
| `empresa.sql` | `ruc` y `logo_url` en `clinicas`, lectura pública, escritura solo admin | Aplicada 2026-08-06 |
| `empresa_nombre_inicial.sql` | Corrige el nombre viejo que había quedado en la fila | Aplicada 2026-08-06 |
| `medicos_vinculo_unico.sql` | Índice único: una cuenta, una sola ficha de odontólogo | Aplicada 2026-08-06 |

---

## Las cinco trampas de este proyecto

Todo lo que se rompió esta sesión salió de estas cinco cosas. Antes de tocar algo, revisar si aplica.

### 1. Los ids son UUID, el código heredado los trata como números

`Number(id)` o `parseInt(id)` sobre un UUID da **NaN**, y `Number(x) || null` da **null**. Eso rompía agendar citas, elegir sillón, cargar tratamientos, los filtros de Reportes y la página de Horarios entera.

**El caso más grave**: `CLINICA_ID` valía `1` y la columna es UUID → la base rechazaba **todo** intento de guardar un paciente o una cita con `invalid input syntax for type uuid: "1"`. Hoy vale el UUID de la clínica única (`src/api/pacientes.ts`); si se cambia allá, cambiarlo en `esquema_completo.sql`.

**Nunca convertir un id a número.** Comparar con `String(a) === String(b)`.

### 2. RLS activado sin políticas significa "cerrado para todos"

Las tablas quedaron con Row Level Security prendido y **sin ninguna regla**: la app entraba, no veía nada y no podía guardar. En Postgres eso no es "abierto", es "cerrado".

Y al revés: las migraciones dentales habían creado políticas `FOR ALL TO authenticated USING (true)`, que significan **cualquiera que esté logueado**, sin rol ni estado. Como las reglas se SUMAN, anulaban el criterio real. **Verificado**: una cuenta sin ningún rol podía escribir en las tablas clínicas. `rls_completo.sql` las quitó y dejó 4 reglas por tabla (`es_odonto_activo()` para leer y escribir, admin para borrar).

Al agregar una tabla, agregarla también a la lista de `rls_completo.sql`.

⚠️ **`recetas` y `receta_items` son la excepción**: no van en esa lista. Sus reglas están en `recetas.sql` y el INSERT es más estricto que el genérico — solo el rol `medico` (`es_odonto_prescriptor()`), porque la receta lleva firma y registro profesional. Si se las agrega al bucle de `rls_completo.sql`, recepción pasaría a poder emitir recetas.

### 3. Los totales guardados no se actualizan solos

`presupuestos.total` y `saldo_pendiente` son columnas guardadas. Nadie las recalculaba: un pago de 250.000 ₲ figuraba en el historial y "Total Abonado" seguía en 0 ₲.

`recalcularTotalesPresupuesto()` (`src/api/odontologia.ts`) corre al agregar, editar o borrar un procedimiento o un pago. **Recalcula desde cero**, no suma sobre lo anterior, para que un borrado no desfase el saldo para siempre. La pantalla además calcula los totales de lo que muestra, así lo de arriba siempre coincide con las listas de abajo.

### 4. Módulos que fingían funcionar

El periodontograma tenía un `setTimeout` que avisaba *"guardado correctamente"* **sin escribir nada**. Reportes consultaba tablas de un sistema médico que en esta base no existen, así que salía vacío para siempre.

Si una pantalla parece funcionar, verificar que **de verdad escriba en la base**.

### 5. Faltan columnas que el código pide

El código viene de un sistema con más campos. `src/lib/esquema.ts` distingue **tabla** faltante (`PGRST205`/`42P01`) de **columna** faltante (`PGRST204`/`42703`) — se diferencian en un dígito y confundirlos manda a crear algo que ya existe. `avisarEsquemaFaltante()` avisa **una vez** por problema, no una por consulta.

---

## Lo que se hizo el 2026-08-04/05

Arrancó con "no puedo iniciar sesión" y terminó con el sistema funcionando de punta a punta. 16 commits.

**Acceso y despliegue**
- La app apuntaba a la base de Sanidad, donde no existe ninguna tabla dental. Se la conectó a la propia.
- Faltaban `profiles` y `user_roles`: sin ellas se entraba y aparecía "Sin acceso".
- Vercel desplegaba desde otro repositorio y bloqueaba los commits porque el correo del autor (`dev@odonto.com`) no correspondía a ninguna cuenta de GitHub. Git local firma ahora con el `noreply` de `Hmoreno2023`.

**Odontograma** (`src/components/odontograma/`)
- Barra de herramientas con estado activo: se elige una vez y se marca con un clic, como con el lápiz rojo en el papel.
- Dientes con forma anatómica según el tipo (`diente-figura.tsx`); las raíces apuntan como en la boca y la arcada inferior está espejada.
- **Nada se guarda hasta apretar Guardar**: antes cada clic escribía en la historia clínica y un error quedaba asentado. Las marcas pendientes se ven punteadas, se deshacen volviendo a marcar, y avisa si se sale sin guardar.

**Presupuestos y pagos**
- El pago no bajaba el saldo (ver trampa 3).
- **Importe editable**: el costo se tomaba fijo de la tarifa. El usuario cobra distinto según el paciente (una extracción de diente de leche a 120, 150 o 180). Ahora la tarifa se propone y el importe se cambia.
- Botón **Imprimir** del presupuesto: la función existía pero ningún botón la llamaba.
- **Comprobante de pagos** y **envío por WhatsApp** (`src/lib/estado-cuenta.ts`): abre el chat del paciente con el estado de cuenta escrito. `telefonoParaWhatsApp()` pasa `0983559700` a `595983559700`; un número corto se descarta en vez de abrir un chat ajeno. **Ninguno de los dos lleva datos clínicos**: un WhatsApp puede terminar en cualquier pantalla.

**Periodontograma** (`src/api/periodontograma.ts`)
- Registro real con el protocolo de **seis sitios por diente**; sondear menos subregistra la enfermedad.
- Índices que se miran para decidir el tratamiento: % de sangrado y de placa, bolsas 4-5 y ≥6 mm, PS promedio. **Los dientes ausentes no entran en los porcentajes**: contarlos bajaría el índice y el paciente parecería más sano.
- Cada guardado crea un registro nuevo y el sondaje de hoy arranca con el anterior, que es como se controla la evolución.

**Otros**
- **Reportes** reescrito sobre `evoluciones_clinicas`, `presupuestos` y `pagos_presupuesto`. Se corrigieron tres errores de fondo: faltaba el último día del período, un plan rechazado contaba como deuda, y la planilla impresa salía mal numerada al filtrar.
- **Alta de odontólogos**: faltaban columnas en `medicos` y no había forma de vincular la ficha con la cuenta. De ese vínculo dependen la firma fija en la agenda y "Mi perfil".
- **Mi perfil**: teléfono y cambio de correo. El campo de teléfono existía pero solo dentro de una tarjeta que aparece si hay ficha de odontólogo, que administración no tiene.
- **Limpieza**: se quitaron 1.249 líneas de 10 impresos del sistema médico anterior que no usaba ninguna pantalla.

---

## Lo que se hizo el 2026-08-06

**Recetario** (`src/api/recetas.ts`, `src/components/pacientes/Recetas.tsx`)

El módulo existía desde el clon del sistema policial pero **nunca funcionó**:
las tablas no existían en esta base (verificado, `PGRST205`) y ningún
componente lo importaba. Además declaraba los ids como `number` cuando son
UUID. Tres decisiones que no conviene deshacer sin entender por qué:

1. **El aviso de alergias** (`alergiasEnConflicto` en `src/lib/medicamentos.ts`)
   cruza lo recetado con la anamnesis antes de emitir. El caso que lo justifica
   es la amoxicilina: no dice "penicilina" en ninguna parte del nombre, pero lo
   es, y esa alergia se cargó meses atrás en otra pestaña. **Avisa, no bloquea**:
   la decisión es del profesional.
2. **Se anula, no se borra.** La receta anulada conserva su número, como el
   talonario de papel. Si desapareciera, el correlativo quedaría con un hueco
   imposible de explicar.
3. **Emitir es solo del rol `medico`**, y eso lo hace cumplir la base, no la
   pantalla (ver la trampa 2).

**Datos del consultorio editables** (`src/api/empresa.ts`)

Se pidió "una tabla `empresa` nueva" y **no se hizo**: `clinicas` ya existía con
nombre, dirección, teléfono y email, y todas las tablas apuntan a ella por
`clinica_id`. Una tabla paralela dejaría dos lugares diciendo cuál es el
consultorio. Se le agregaron `ruc` y `logo_url`.

`clinicas` se lee **sin haber iniciado sesión** (política `TO anon`): el nombre
y el logo se muestran en el login, que es anterior a tener cuenta. No hay
ningún dato de pacientes en esa tabla.

**Alta de usuarios**: no funcionaba por dos motivos independientes — la pantalla
armaba la URL con `import.meta.env.VITE_SUPABASE_URL`, que en Vercel no está
definida, y la Edge Function `create-user` nunca existió (`404`). Se arregló lo
primero y se escribió la función; falta publicarla desde el panel.

**Vínculo ficha ↔ cuenta**: la pantalla ya impedía reasignar una cuenta tomada,
pero la base no. Con dos fichas apuntando a la misma cuenta, `fetchMiMedico()`
reventaba y el odontólogo quedaba sin recetas, sin firma y sin «Mi perfil».
Se agregó un índice único y la consulta ya no usa `.maybeSingle()`.


## Los logos

| Archivo | Para qué | Dónde se usa |
|---|---|---|
| `public/mova-dent-logo-transparente.png` | El original, cian claro | Login (fondo oscuro) |
| `public/mova-dent-icono.png` | La muela recortada en 512x512 sobre fondo oscuro propio | Ícono del navegador y menú lateral |
| `public/mova-dent-logo-impresion.png` | Versión oscurecida | Los impresos |
| `src/lib/logo-impresion-base64.ts` | El anterior incrustado en base64 | Lo que consume `imprimir.ts` |

Tres cosas que no son obvias:

1. **El logo original es para fondo oscuro.** Su color más usado es `#60F0F0`,
   cian claro, y sobre papel blanco se lava. Por eso existe la versión de
   impresión: se le bajó la luminancia al cian y el relleno casi blanco de las
   letras pasó a azul oscuro.
2. **El de impresión va incrustado en base64, no como `<img src="/archivo.png">`.**
   Los impresos se arman en un iframe y se manda a imprimir 250 ms después: con
   una URL, si la imagen no bajó a tiempo, el papel sale sin logo. Mismo motivo
   que el viejo `header-logos-base64.ts`.
3. **Es solo el valor de fábrica.** El logo que el admin suba en Mantenimiento →
   Consultorio (columna `clinicas.logo_url`, data URL) le gana en todos lados.

Los íconos cuadrados se generaron midiendo la muela sobre un canvas
(x 0..118, y 2..123 de un logo de 457x124) y recortándola con Playwright. No
hay Pillow ni ImageMagick en este equipo: para procesar imágenes se usa el
Chrome del sistema vía Playwright.

## Comandos

```bash
npm run dev          # Vite (puerto 5173)
npm run build        # tsc && vite build (el type-check bloquea el build)
npm run test:run     # Vitest una corrida (154 tests)
npm run lint         # eslint --max-warnings 0
npm run type-check   # tsc --noEmit
```

Publicar: `git push vercel main && git push origin main`. Vercel despliega solo desde `vercel`.

**Nota sobre el deploy**: los cambios de una pantalla van a un archivo aparte (`Reportes-*.js`), así que comparar el hash del `index-*.js` NO sirve para saber si salió. Verificar abriendo la pantalla.

---

## Convenciones

- **Capa de datos** en `src/api/<dominio>.ts`: funciones `fetch*` + hooks de React Query. Páginas en `src/pages/`, componentes en `src/components/`.
- **Baja lógica** (`activo: false`), no borrado: la historia clínica no se pierde. Borrar de verdad es solo de admin.
- **`retry: 0`** en las mutaciones que crean algo: el reintento de React Query duplicaba pacientes y consultas.
- **Impresión**: `src/lib/imprimir.ts`, todo pasa por `ejecutarImpresionIframe`. Quedan 5 impresos, todos odontológicos.
- **Ancho de los diálogos**: el `DialogContent` base usa `w-[calc(100%-2rem)] max-w-lg` **sin prefijo de media query**. tailwind-merge no ve conflicto entre variantes distintas, así que un `sm:max-w-lg` gana siempre y deja todos los modales a 512px. Antes de pelear con un layout, revisar si la clase la está pisando el componente base de `ui/`.
- **SweetAlert2 dentro de un modal**: `ui/dialog.tsx` ignora los clics nacidos en `.swal2-container`; si no, aceptar el aviso cerraba el formulario de atrás con todo cargado. Los handlers van **después** del spread `{...props}`.

## Cómo verificar

El usuario no puede revisar el código: la verificación es responsabilidad de Claude. Lo que funcionó bien esta sesión:

1. **Probar en el navegador con Playwright** usando el Chrome del sistema (`channel: 'chrome'`; los binarios de Playwright no están descargados). Los scripts van al scratchpad.
2. **Preparar datos por API** con la service_role key y **borrar SOLO lo que se creó**, guardando los ids devueltos por el insert:

   ```js
   const creados = [];
   const [p] = await (await fetch(SB + '/rest/v1/presupuestos', {método POST...})).json();
   creados.push(p.id);
   // al terminar:
   for (const id of creados) await fetch(SB + '/rest/v1/presupuestos?id=eq.' + id, { method: 'DELETE', ... });
   ```

   ⛔ **NUNCA** un DELETE con filtro amplio (`?id=not.is.null`, `?id=neq.<algo>`, `?id=gt.0`). Eso borra la tabla entera.

   **Pasó de verdad el 2026-08-05**: los scripts de prueba limpiaban con
   `presupuestos?id=not.is.null` y **borraron el plan de tratamiento que la
   usuaria estaba cargando**, con su pago incluido. Lo notó porque el
   Dashboard le quedó en cero. Esta es una base en uso, no un entorno de
   pruebas: cada fila puede ser el trabajo de alguien.

   Si de verdad hace falta partir de cero, preguntarle antes.
3. **Verificar contra la base**, no solo contra la pantalla: que el registro quede escrito es lo que importa.
4. Cuando un control falla, **confirmar si es la app o la prueba** antes de anunciar un error. Varias veces fue el selector o una expresión de búsqueda.

Trampas de los scripts de prueba: PostgREST exige que todos los objetos de un lote tengan **las mismas claves**; `presupuesto_detalles.tratamiento_id` es obligatorio; `innerText` no incluye los textos de marcador de posición y sí aplica `text-transform: uppercase`.

---

## Pendientes

1. **Cargar los odontólogos reales** en Mantenimiento → Médicos, vinculando cada uno a su cuenta. **Bloquea las recetas**: sin ficha vinculada no se puede emitir ninguna, porque el documento se firma con ese nombre y su `numero_colegiatura`. Al 2026-08-06 sigue habiendo 0.
2. **Publicar la Edge Function `create-user`** desde el panel (Edge Functions → Deploy via Editor, nombre exacto `create-user`, pegar `supabase/functions/create-user/index.ts`). Sin ella el botón "Crear usuario" falla: **la función nunca existió en el servidor**, respondía `404 NOT_FOUND`.
3. **Completar los datos del consultorio** en Mantenimiento → Consultorio: el nombre ya está, faltan RUC, dirección y teléfono. Salen en todos los impresos.
4. **Revisar las tarifas**: hay 12 de ejemplo.
5. Sin revisar: los impresos de odontograma y consentimiento, cómo se ve en celular, y **emitir una receta de punta a punta** (no se pudo por el punto 1).
6. Sin decidir: el PDF `Documento A5 Recetario...` que el usuario dejó en `public/`. **No está commiteado, así que NO se publica**, pero conviene sacarlo de esa carpeta: todo lo que está ahí queda accesible en internet. Puede ser el diseño que quiere para la receta impresa.

### Cosas que YA NO son pendientes (verificadas el 2026-08-06)

- ~~Apagar el registro público en Supabase~~ → **ya está cerrado**. Se comprueba
  sin tocar nada en `GET /auth/v1/settings` (`disable_signup: true`).
- ~~Confirmación de correo trabando cuentas nuevas~~ → resuelto de raíz: la
  Edge Function crea las cuentas con `email_confirm: true`. Mejor que apagar la
  confirmación en el panel, que la dejaría apagada si algún día se reabre el
  registro.
- ~~Botones "Accesos Rápidos de Prueba / Demo" a la vista en el login~~ →
  **falsa alarma**. Están dentro de `{import.meta.env.DEV && ...}`, así que no
  llegan al sitio publicado. Verificado buscando "Accesos R" y los correos de
  las cuentas en `dist/assets/*.js`: no aparecen. Si se ven, es porque se está
  mirando `npm run dev`.
- ~~Falta el logo de Mova Dent~~ → cargado. Ver la sección de logos más abajo.
