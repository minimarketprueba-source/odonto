# Sistema de Gestión — Clínica Odontológica

Qué es, qué tiene y qué permite hacer.

**Dónde está**: https://odonto-pied.vercel.app · Se usa desde la computadora o el celular, con el navegador. No hay que instalar nada.

---

## Índice

1. [Qué resuelve](#qué-resuelve)
2. [Quién entra y qué puede hacer](#quién-entra-y-qué-puede-hacer)
3. [Los módulos](#los-módulos)
4. [La ficha del paciente](#la-ficha-del-paciente-el-corazón-del-sistema)
5. [Los documentos que emite](#los-documentos-que-emite)
6. [Lo que el sistema cuida por usted](#lo-que-el-sistema-cuida-por-usted)
7. [Lo que todavía no hace](#lo-que-todavía-no-hace)

---

## Qué resuelve

Reemplaza la carpeta de papel y la planilla de Excel por un solo lugar donde queda **todo lo del paciente**: su historia clínica dental, lo que se le hizo en cada sesión, lo que se le presupuestó y lo que pagó.

Las tres preguntas que responde en cualquier momento:

- **¿Qué le hice a este paciente?** → su odontograma, sus evoluciones, su periodontograma
- **¿Cuánto me debe?** → su estado de cuenta, y el total de toda la clínica
- **¿Cómo viene el mes?** → producción por odontólogo, cobrado y por cobrar

---

## Quién entra y qué puede hacer

Cada persona entra con su propio correo y contraseña. **No hay registro abierto**: las cuentas las crea un administrador.

| Rol | Qué ve |
|---|---|
| **Administrador** | Todo, más el control de usuarios y las tarifas |
| **Odontólogo** | Pacientes, agenda, presupuestos y reportes |
| **Recepción** | Pacientes, agenda y presupuestos |
| **Asistente dental** | Pacientes y agenda |

Cada rol solo ve los módulos que le corresponden: si no tiene permiso, el módulo directamente no le aparece en el menú.

**Los odontólogos tienen una ficha profesional propia** (nombre, matrícula, especialidad) vinculada a su cuenta. Eso hace que al agendar aparezcan automáticamente como el profesional que atiende, y que su nombre y matrícula salgan en los documentos que emiten. Nadie puede registrar algo a nombre de otro profesional.

---

## Los módulos

### 🏠 Panel principal

Lo primero que se ve al entrar:

- **Citas de hoy**: cuántas hay, cuántas atendidas y cuántas por atender
- **Pacientes registrados**
- **Total cotizado, cobrado y saldo pendiente** de la clínica
- **Gráficos**: balance de caja y estado de los planes de tratamiento
- **La agenda del día**, con los pacientes de hoy y su hora

### 👥 Pacientes

El padrón completo, con buscador por nombre o cédula.

Se registra: nombres y apellidos, documento, fecha de nacimiento, sexo, teléfono, correo, dirección y categoría. El documento es opcional (un menor puede no tener cédula todavía).

**Protección contra duplicados**: si intenta cargar a alguien con una cédula que ya existe, el sistema lo avisa antes de crear una segunda ficha.

Los pacientes **no se borran, se dan de baja**: la historia clínica no se pierde nunca. Reactivar es un clic.

### 📅 Citas

La agenda. Se agenda eligiendo paciente, tratamiento, fecha, hora y sillón.

- **La duración se calcula sola** según el tratamiento: una limpieza son 30 minutos, una endodoncia 90, un implante 2 horas
- Avisa si se agenda fuera del horario de atención o en un día de ausencia del profesional
- **Signos vitales antes de atender**: presión, pulso, temperatura. Importan antes de anestesiar
- Estados: pendiente, confirmada, admitida, atendida, cancelada, no acudió

### 🕐 Horarios

Los días y horas de atención de cada odontólogo, y sus ausencias (vacaciones, congresos, permisos). Es lo que usa la agenda para avisar cuando se agenda fuera de horario.

### 💲 Presupuestos

Todos los planes de tratamiento de la clínica, con buscador y filtro por estado.

Arriba, **las cuentas de todo lo que se está viendo**: total cotizado, cobrado, por cobrar, cuántos pacientes tienen saldo y qué porcentaje se cobró. Si busca un paciente, las cuentas son de ese paciente.

Incluye el **tarifario**: la lista de tratamientos con su precio. Los precios son una **sugerencia**, no una imposición: al armar un presupuesto se puede cambiar el importe caso por caso.

### 📊 Reportes

La producción del período, por día, semana, mes o rango de fechas.

- **Planilla imprimible**: cada tratamiento realizado con fecha, paciente, pieza, procedimiento, nota clínica y profesional
- **Cobrado y por cobrar** del período
- **Estadísticas**: citas por estado, por especialidad y por profesional

### 💵 Liquidaciones

Las comisiones de cada odontólogo sobre su producción, con su estado de pago.

### ⚙️ Mantenimiento

Solo para administradores:

- **Médicos**: alta y edición de los odontólogos, con matrícula, especialidad, contacto y la cuenta con la que entran
- **Especialidades**
- **Tarifario**

### 🔐 Usuarios

Solo para administradores. Crear cuentas, asignar rol y permisos módulo por módulo, suspender y reactivar, cambiar contraseñas.

### 👤 Mi perfil

Los datos propios: nombre, apellido, matrícula, teléfono, correo y contraseña.

---

## La ficha del paciente, el corazón del sistema

Se entra desde Pacientes y tiene **siete pestañas**:

### 🦷 Odontograma

El mapa de la boca: **32 piezas permanentes y 20 temporales**, cada una con sus cinco caras.

- Se elige un estado —caries, obturación, corona, endodoncia, extracción, ausente, implante— y se marca con un clic, como con el lápiz rojo sobre el papel
- Los dientes tienen **forma real** según el tipo (molar, premolar, canino, incisivo) y las raíces apuntan como en la boca
- **Nada se guarda hasta confirmar**: lo marcado se ve punteado y recién se asienta en la historia clínica al apretar *Guardar*. Un clic por error se deshace marcando de nuevo
- Al costado, el historial de todo lo registrado con su fecha

### 📋 Evolución

Lo que se hizo en cada sesión: fecha, pieza, procedimiento y nota clínica. Es el relato cronológico del tratamiento.

### 🔬 Periodontograma

El registro periodontal completo, con el **protocolo de seis sitios por diente** (tres por vestibular y tres por palatino).

- Profundidad de sondaje, sangrado y placa en cada sitio
- Movilidad y furca por diente, y piezas ausentes
- Colores por gravedad: verde hasta 3 mm, ámbar de 4 a 5, rojo de 6 en adelante
- **Los índices se calculan solos**: porcentaje de sangrado, de placa, cantidad de bolsas moderadas y profundas, profundidad promedio
- Cada control queda guardado aparte, y **el sondaje nuevo arranca con los valores del anterior**: se corrige lo que cambió en vez de recargar 192 mediciones

### 🫀 Anamnesis

Los antecedentes médicos: alergias (látex, anestésicos), problemas cardíacos, presión arterial, medicación y enfermedades sistémicas.

**Las alergias y el riesgo cardíaco aparecen destacados en rojo en la cabecera de la ficha**, visibles desde cualquier pestaña.

### 💰 Planes

Los presupuestos del paciente.

- Se arma agregando procedimientos: se elige de la lista **con buscador**, se indica la pieza y el importe (que viene sugerido de la tarifa pero se puede cambiar)
- **Total cotizado, abonado y saldo**, siempre calculados de lo que está cargado
- Si el paciente tiene **varios tratamientos**, arriba se ve el consolidado de todos
- **Historial de pagos**: cada seña y cada pago fraccionado, con método y comentario
- Si pagó de más, avisa cuánto tiene a favor
- Un plan rechazado **no cuenta como deuda**

### 🖼️ Imágenes

Radiografías y fotos clínicas, con tipo y descripción.

### ✍️ Firmas

Consentimientos informados firmados por el paciente **con el dedo en la pantalla**, guardados con fecha.

---

## Los documentos que emite

Todos se imprimen o se guardan como PDF desde el navegador.

| Documento | Qué lleva | Para qué |
|---|---|---|
| **Presupuesto** | Tratamientos, importes, pagos y saldo | Se le entrega al paciente |
| **Planilla del historial** | Todos sus tratamientos, planes y pagos | Para la carpeta del paciente |
| **Comprobante de pagos** | Los pagos recibidos, total y saldo | Constancia de lo abonado |
| **Periodontograma** | Las dos arcadas con el sondaje completo | Historia clínica y derivaciones |
| **Producción** | Los tratamientos del período | Control interno |

### 📲 Envío por WhatsApp

El **estado de cuenta se manda por WhatsApp** con un botón: abre el chat del paciente con el mensaje ya escrito, usando el teléfono de su ficha.

El mensaje lleva los pagos recibidos, el total y el saldo. **Nunca datos clínicos**: un mensaje puede terminar en cualquier pantalla, y para cobrar alcanza con la cuenta.

---

## Lo que el sistema cuida por usted

**Las cuentas nunca se descuadran.** El total y el saldo se recalculan solos cada vez que se agrega, edita o borra un procedimiento o un pago. El saldo nunca queda en negativo: si el paciente adelantó dinero, informa cuánto tiene a favor.

**Nada se pierde.** Los pacientes se dan de baja, no se borran. Cada periodontograma queda guardado aparte para comparar la evolución. Borrar de verdad es solo del administrador.

**Nada se asienta por error.** El odontograma no escribe en la historia clínica hasta confirmar, y avisa si se sale de la ficha con marcas sin guardar.

**Cada registro queda firmado.** Con el nombre y la matrícula de quien lo hizo. Un profesional no puede registrar a nombre de otro.

**Los datos están protegidos.** Cada persona ve solo lo que su rol permite, y esa regla se aplica en el servidor, no solo en la pantalla: no alcanza con conocer la dirección web para acceder a nada.

**Funciona en el celular.** Todas las pantallas se adaptan, y los botones tienen el tamaño necesario para tocarlos con el dedo.

**Se lee en claro y en oscuro**, sin colores que cansen la vista.

---

## Lo que todavía no hace

Para que quede claro qué esperar:

- **No emite facturas legales** ni se conecta con la DNIT. Los comprobantes son internos
- **No manda recordatorios automáticos** de las citas al paciente
- **No tiene sala de espera** ni turnos por pantalla
- **No maneja stock** de materiales ni insumos
- **No se conecta con obras sociales** ni seguros
- **No guarda las radiografías en la nube**: las imágenes quedan en la ficha, no en un archivo aparte
- **Una sola clínica**: no está pensado para varias sucursales

---

*Última actualización: 5 de agosto de 2026*
