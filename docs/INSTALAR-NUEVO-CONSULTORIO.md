# Instalar el sistema para un consultorio nuevo

Cada consultorio tiene **su propio sitio y su propia base de datos**, totalmente
separados. Ningún consultorio puede ver los pacientes de otro, porque sus datos
ni siquiera están en el mismo lugar.

Todos los sitios salen del **mismo código**: cuando se publica una mejora, se
actualizan todos solos.

Se tarda unos 30 minutos. Hacen falta:

- Una cuenta de correo para el consultorio (por ejemplo, de Gmail).
- Acceso a la cuenta de Vercel donde está publicado Mova Dent
  (`minimarketprueba-2203`).

---

## Paso 1 — Crear la base de datos

1. Entrar a https://supabase.com e iniciar sesión (o crear una cuenta con el
   correo del consultorio).
2. **New project**.
   - **Name**: el nombre del consultorio, por ejemplo `consultorio-sonrisas`.
   - **Database Password**: apretar **Generate a password** y **guardarla** en
     un lugar seguro. No se vuelve a mostrar.
   - **Region**: *South America (São Paulo)*, la más cercana a Paraguay.
3. **Create new project** y esperar unos 2 minutos a que termine.

> El plan gratis de Supabase permite **2 proyectos por cuenta** y pausa la base
> si nadie la usa durante una semana (se reactiva desde el panel). Para un
> consultorio que trabaja todos los días no es problema; para más de dos
> consultorios, usar otra cuenta o el plan pago.

## Paso 2 — Instalar las tablas

1. En el menú de la izquierda: **SQL Editor** → **New query**.
2. Abrir el archivo [`supabase/instalacion_completa.sql`](../supabase/instalacion_completa.sql),
   copiar **todo** su contenido y pegarlo.
3. **Run**.
4. Abajo tiene que aparecer **"Instalación terminada"**.

Si aparece un error, se puede volver a ejecutar entero: no rompe nada.

## Paso 3 — Cerrar el registro público

Que nadie pueda crearse una cuenta desde afuera:

1. **Authentication** → **Sign In / Providers** (o **Providers**).
2. Apagar **Allow new users to sign up**.
3. **Save**.

## Paso 4 — Crear la cuenta del administrador

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Poner el correo y una contraseña, y marcar **Auto Confirm User**.
3. Volver al **SQL Editor** → **New query**, pegar esto **cambiando el correo**
   y apretar **Run**:

   ```sql
   INSERT INTO public.user_roles (user_id, role, status, permissions)
   SELECT id, 'admin', 'Activo', '{}'::jsonb
   FROM auth.users
   WHERE email = 'correo-del-administrador@ejemplo.com'
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin', status = 'Activo';
   ```

   Tiene que decir **Success. 1 row**. Si dice *0 rows*, el correo no coincide
   con el del punto 2.

Los demás usuarios (odontólogos, recepción) los crea después el administrador
desde el sistema, en **Usuarios**.

## Paso 5 — Publicar la función que crea usuarios

Sin esto, el botón **Crear usuario** del sistema no funciona.

1. **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. **Name**: exactamente `create-user`.
3. Borrar el código de ejemplo y pegar el contenido de
   [`supabase/functions/create-user/index.ts`](../supabase/functions/create-user/index.ts).
4. **Deploy function**.

## Paso 6 — Anotar los datos de conexión

1. **Project Settings** (el engranaje) → **API** (o **Data API**).
2. Copiar dos datos:
   - **Project URL**: algo como `https://abcdefghijk.supabase.co`
   - **anon public** (en *Project API keys*): una clave larga que empieza con `eyJ`.

   ⚠️ La **anon** sí. La **service_role** NO: esa abre toda la base y no se
   pone nunca en el sitio.

## Paso 7 — Publicar el sitio en Vercel

1. Entrar a https://vercel.com con la cuenta `minimarketprueba-2203`.
2. **Add New…** → **Project** → importar el repositorio **`Hmoreno2023/odonto`**.
3. **Project Name**: el del consultorio, por ejemplo `consultorio-sonrisas`.
   Será la dirección del sitio: `consultorio-sonrisas.vercel.app`.
4. Abrir **Environment Variables** y agregar las dos del paso 6:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL |
   | `VITE_SUPABASE_ANON_KEY` | la clave anon public |

5. **Deploy** y esperar a que diga **Ready**.

> Si la publicación falla con **"FALTA INDICAR LA BASE DE DATOS DE ESTE
> CONSULTORIO"**, faltan las variables del punto 4. Es a propósito: sin ellas,
> el sitio nuevo se conectaría a la base de Mova Dent.

> **Para cobrarle a otro consultorio**, Vercel exige el plan Pro: el plan
> gratis (Hobby) es solo para uso personal, no comercial.

## Paso 8 — Comprobar y cargar los datos del consultorio

1. Abrir el sitio nuevo. La pantalla de ingreso tiene que decir
   **"Consultorio"**, no "Mova Dent". Si dice Mova Dent, las variables del
   paso 7 están mal: el sitio está conectado a otra base.
2. Entrar con la cuenta del administrador.
3. **Mantenimiento → Consultorio**: nombre, nombre corto, RUC, dirección,
   teléfono, logo, ícono y color. Salen en todos los papeles impresos.
4. **Presupuestos → Lista de Precios**: vienen precios de ejemplo; cambiarlos por
   los del consultorio.
5. **Mantenimiento → Médicos**: cargar a cada odontólogo y vincularlo a su
   cuenta. Sin eso no se pueden emitir recetas.
6. **Usuarios**: crear las cuentas del resto del personal.

---

## Mantenimiento: cuando se agregan cambios a la base

Las mejoras de **pantallas** llegan solas a todos los consultorios. Los cambios
en la **base de datos** (archivos nuevos en `supabase/migrations/`) **no**:
cada uno hay que ejecutarlo en el SQL Editor de **cada** consultorio. Conviene
llevar una lista de los consultorios instalados para no olvidarse de ninguno.
