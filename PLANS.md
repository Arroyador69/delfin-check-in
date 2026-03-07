# Planes de Delfín Check-in

Documento de referencia de los 4 planes del sistema. Usar en landing, onboarding, Stripe, referidos y afiliados.

---

## SuperAdmin (solo plataforma)

- **El área SuperAdmin es exclusiva del dueño de la plataforma.** No es un plan ni una función para clientes.
- Ningún tenant, ni ningún usuario que contrate cualquiera de los 4 planes (Básico, Check-in, Standard, Pro), tiene acceso a SuperAdmin.
- El acceso se controla por `is_platform_admin` en la base de datos; solo las cuentas marcadas como administrador de plataforma pueden usar rutas y páginas `/superadmin/*`.

---

## 1. Básico (Gratis)

- **ID en sistema:** `basic` / `plan_type: 'free'`
- **Precio:** 0 €/mes
- **Propiedades:** 2 incluidas (límite fijo; no se pueden añadir más sin cambiar de plan)
- **Anuncios:** Sí
- **Registro de viajeros:** Sí
  - Formulario para enviar a viajeros
  - Datos guardados en el sistema
  - **Solo descarga XML** para subida manual al Ministerio del Interior (SES)
  - Sin envío automático al MIR
- **Reservas directas:** Sí (comisión plataforma **9%**)
- **Envío automático MIR:** No

**Ideal para:** Probar el PMS y cumplir la ley descargando el XML y subiéndolo manualmente.

---

## 2. Check-in

- **ID en sistema:** `checkin` / `plan_type: 'checkin'`
- **Precio:** **2 €/mes** + **2 € por cada propiedad/habitación**
  - Ejemplo: 1 propiedad = 2 €, 3 propiedades = 6 €, 5 = 10 €
- **Propiedades:** Ilimitadas (cada una suma 2 €/mes)
- **Anuncios:** Sí
- **Registro de viajeros:** Sí, con **envío automático al Ministerio** (MIR)
- **Reservas directas:** Sí (comisión **9%**)
- **Envío automático MIR:** Sí

**Ideal para:** Quien quiere envío automático al Ministerio pagando solo por uso (2 € + 2 €/propiedad).

---

## 3. Standard

- **ID en sistema:** `standard` / `plan_type: 'standard'`
- **Precio:** **9,99 €/mes** (1 propiedad/habitación incluida) + **2 € por cada propiedad/habitación adicional**
  - Igual que Check-in: el precio base incluye 1 unidad; cada nueva son 2 €/mes
  - Ejemplo: 1 propiedad = 9,99 €; 3 propiedades = 9,99 + 4 € = 13,99 €; 5 = 9,99 + 8 € = 17,99 €
- **Propiedades:** 1 incluida en la cuota, luego 2 €/mes por cada una extra
- **Anuncios:** **No**
- **Registro de viajeros:** Sí, con envío automático MIR
- **Reservas directas:** Sí (comisión **9%**)
- **Envío automático MIR:** Sí

**Ideal para:** Quien quiere quitar anuncios; misma lógica de precio por propiedad que Check-in (1 incluida + 2 €/adicional).

---

## 4. Pro

- **ID en sistema:** `pro` / `plan_type: 'pro'`
- **Precio:** **29,99 €/mes** (1 propiedad/habitación incluida) + **2 € por cada propiedad/habitación adicional**
  - Igual que Check-in y Standard: precio base = 1 unidad; cada nueva son 2 €/mes
  - Ejemplo: 1 propiedad = 29,99 €; 3 propiedades = 29,99 + 4 € = 33,99 €; 5 = 29,99 + 8 € = 37,99 €
- **Propiedades:** 1 incluida en la cuota, luego 2 €/mes por cada una extra
- **Anuncios:** **No**
- **Registro de viajeros:** Sí, con envío automático MIR
- **Reservas directas:** Sí (comisión **5%** — reducida respecto al resto de planes)
- **Envío automático MIR:** Sí

**Ideal para:** Máximo servicio, sin anuncios y comisión mínima en reservas directas; misma lógica 1 incluida + 2 €/adicional.

---

## Resumen rápido

| Plan     | Precio        | Anuncios | MIR auto | Comisión reservas directas | Propiedades |
|----------|---------------|----------|----------|----------------------------|-------------|
| Básico   | 0 €           | Sí       | No       | 9%                         | 2 (límite)  |
| Check-in | 2 € + 2 €/prop| Sí       | Sí       | 9%                         | 1 incl. + 2 €/adicional |
| Standard | 9,99 € + 2 €/prop| No   | Sí       | 9%                         | 1 incl. + 2 €/adicional |
| Pro      | 29,99 € + 2 €/prop| No    | Sí       | **5%**                     | 1 incl. + 2 €/adicional |

---

## Reglas técnicas

- **Precio por propiedad adicional (planes de pago):** siempre **2 €/mes** (Check-in, Standard y Pro).
- **Comisión reservas directas:** 9 % para Básico, Check-in y Standard; **5 %** para Pro.
- **Anuncios:** `ads_enabled = true` solo en Básico y Check-in; `false` en Standard y Pro.
- **MIR:** `legal_module = true` en Check-in, Standard y Pro; `false` en Básico (solo XML descargable).

---

## Base de datos

- **No hace falta crear una nueva tabla de planes.** Los planes se identifican por `plan_type` en `tenants` (`free`, `checkin`, `standard`, `pro`).
- Para que el plan **Standard** sea válido en BD hay que **ejecutar la migración** que amplía los CHECK de `plan_type` y referidos:
  - Archivo: `database/migration-add-plan-standard.sql`
  - Acción: añade `'standard'` a `tenants.plan_type` y, si existen, a `referrals.referred_plan_type` y tablas relacionadas de referidos.
- Después de desplegar el código nuevo, ejecutar ese SQL en Neon (o tu instancia PostgreSQL) para poder guardar y actualizar tenants con `plan_type = 'standard'`.

---

## Landing (delfincheckin.com)

- La landing principal (carpeta **delfincheckin.com** / repo delfincheckin.com) está actualizada con los **4 planes**: Básico (0€), Check-in (2€+2€/prop), Standard (9,99€/mes, 1 incl. +2€/prop), Pro (29,99€/mes, 1 incl. +2€/prop, 5% comisión). En todos los planes de pago: 1 propiedad incluida en el precio base y 2 €/mes por cada propiedad o habitación adicional.
