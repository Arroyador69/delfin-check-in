# Por qué al dar a Dashboard te lleva al login (y por qué tras el login vas a Reservas)

---

## Por qué no se muestra la página del dashboard (respuesta directa)

La página del dashboard **sí existe** (está en la ruta **`/`**, archivo `app/page.tsx`), pero **no se llega a pintar** por cómo está hecho el **AdminLayout**:

1. **AdminLayout envuelve** la página del dashboard (y el resto del admin).
2. **Solo muestra el contenido** (vídeo, resúmenes, reservas, etc.) cuando **`isAuthenticated === true`**.
3. **`isAuthenticated`** se pone a `true` **solo si** al cargar la página alguna de estas peticiones responde OK:
   - **`/api/auth/verify`** → 200, o  
   - **`/api/tenant`** → 200 (o el reintento que se hace en la ruta `/`).
4. Cuando entras en **`/`** (al hacer clic en Dashboard), **esas dos APIs están respondiendo 401** (o no 200). Por tanto **nunca** se pone `isAuthenticated = true`.
5. Si **no** está autenticado, el AdminLayout hace **dos cosas**:
   - **`return null`** → no renderiza nada (no ves el dashboard).
   - Y en **checkAuth** hace **`router.push('/admin-login')`** → te manda al login.

**Conclusión:** no ves el dashboard porque **la comprobación de sesión en esa ruta falla** (verify/tenant devuelven 401), así que el layout **nunca** marca sesión válida y **nunca** muestra el contenido; solo redirige al login. El fallo no es que la página no exista, sino que **esa comprobación en `/` no está pasando**.

La causa de fondo que habría que investigar es: **por qué esas mismas APIs devuelven 401 cuando la petición se hace al cargar `/`**, y en cambio en **`/reservations`** sí pasan (cookie que no se envía en esa navegación, timing, o algo específico de la ruta `/`).

---

## Resumen en una frase

**Dashboard** enlaza a la ruta **`/`**. Esa página está protegida por **AdminLayout**, que comprueba la sesión; si esa comprobación falla (recibe 401), te manda al **login**. Tras el login te mandamos a **Reservas** a propósito para que siempre puedas entrar al panel y no caer en un bucle.

---

## 1. Qué pasa cuando le das a "Dashboard"

- En el menú, **Dashboard** tiene `href="/"` (ruta raíz).
- Al hacer clic vas a **`/`**. Esa ruta es la página principal del admin (vídeo, resúmenes, reservas actuales y próximas).
- Esa página usa **AdminLayout**, que **siempre** hace una comprobación de sesión al cargar:
  1. Llama a **`/api/auth/verify`** (¿tengo cookie válida?).
  2. Si responde 401, llama a **`/api/tenant`** (¿puedo cargar mi tenant con la cookie?).
  3. Si también 401, en la ruta **`/`** hace **un reintento** tras 500 ms (verify y tenant otra vez).
  4. Si **todo** sigue en 401, **AdminLayout** te redirige a **`/admin-login`** (login).

Por tanto: **si al cargar `/` las APIs de verify y tenant devuelven 401, nunca se te considera “logueado” en esa página y acabas en el login.** No es que Dashboard “no exista”; es que la comprobación de sesión en esa ruta está fallando.

---

## 2. Por qué tras el login te lleva a Reservas (y está hecho así a propósito)

En la **página de login** (`admin-login/page.tsx`) está puesto así:

- **Tras login correcto:** el destino por defecto es **`/reservations`**, no **`/`**.
- **Si ya tienes sesión** y entras en la página de login: igual, por defecto te redirige a **`/reservations`**.

Se hizo así por un **bucle** que teníamos antes:

1. Tras login te mandábamos a **`/`** (dashboard).
2. En **`/`**, AdminLayout hacía checkAuth → verify/tenant devolvían 401 → te mandaba otra vez al **login**.
3. En login, al detectar sesión (o al volver a loguearte), te mandaba otra vez a **`/`**.
4. Se repetía: login → `/` → login → `/` y parecía que “no entrabas” al admin.

Para **cortar ese bucle** y **asegurar que siempre puedas entrar al panel**, se cambió el destino tras login a **`/reservations`**. En Reservas la comprobación de sesión sí pasa (o pasaba de forma estable), así que entras al admin y puedes trabajar. El “coste” es que la **primera pantalla** tras el login ya no es el dashboard con el vídeo, sino Reservas.

---

## 3. A qué se debe que Dashboard te lleve al login (causa de fondo)

La causa es **una sola**: en la ruta **`/`**, cuando AdminLayout hace **checkAuth**:

- Las peticiones a **`/api/auth/verify`** y **`/api/tenant`** reciben **401** (o al menos no devuelven 200).
- Por eso AdminLayout asume “no autenticado” y te redirige al login.

Eso puede deberse a cosas como:

- **Cookie no enviada** en esa navegación concreta (por ejemplo, al ir a **`/`** con un clic desde otra página del admin, el navegador a veces no envía la cookie en la primera petición o en los fetch que hace AdminLayout).
- **Timing**: la cookie ya está guardada pero el primer verify/tenant se ejecuta antes de que el contexto de la página tenga la sesión “lista”.
- Algún detalle de **dominio / path / SameSite** de la cookie que hace que en **`/`** no se envíe igual que en **`/reservations`**.

En **`/reservations`** la misma cookie y las mismas APIs suelen ir bien (por eso entras tras el login). En **`/`** algo hace que esa comprobación falle y por eso “Dashboard” acaba en login.

---

## 4. Cómo está montado todo (para tenerlo claro)

| Qué haces            | Ruta        | Qué hace el código                                      | Resultado típico        |
|----------------------|------------|----------------------------------------------------------|--------------------------|
| Clic en "Dashboard"  | `/`        | AdminLayout hace verify + tenant (+ reintento en `/`).   | Si 401 → login           |
| Clic en "Reservas"   | `/reservations` | Mismo AdminLayout, mismo checkAuth.                | Suele 200 → ves Reservas |
| Tras hacer login     | -          | Login te manda a `target` = **`/reservations`** (a propósito). | Entras a Reservas        |
| Si `?redirect=/`     | -          | En login, por evitar bucle, se convierte a `/reservations`.     | No te manda al dashboard |

Es decir: **no es que Dashboard esté roto**, sino que **la validación de sesión en la ruta `/` falla** y por eso esa ruta te echa al login. Y **que tras el login vayas a Reservas es una decisión hecha a propósito** para que siempre tengas una entrada estable al admin.

---

## 5. Qué habría que conseguir para que Dashboard funcionara

Para que al dar a Dashboard **no** te lleve al login y veas la página principal (vídeo, resúmenes, etc.) haría falta que, **al cargar la ruta `/`**:

- **`/api/auth/verify`** o **`/api/tenant`** respondieran **200** cuando la petición se hace desde esa página (con la misma cookie que ya usas en Reservas).

Eso implica revisar por qué en **`/`** esas peticiones reciben 401 (por ejemplo con Network: ver si la cookie va en la petición y qué contestan verify y tenant). Cuando eso se solucione, AdminLayout dejará de redirigir al login y Dashboard se verá como siempre.

---

## 6. Resumen para explicarlo a alguien

- **“¿Por qué al dar a Dashboard me lleva al login?”**  
  Porque la página del Dashboard (`/`) comprueba la sesión; si esa comprobación falla (las APIs devuelven 401), te manda al login para que te identifiques.

- **“¿Por qué después de iniciar sesión voy a Reservas y no al Dashboard?”**  
  Porque lo hemos dejado así a propósito: así siempre puedes entrar al panel. Si te mandáramos al Dashboard tras el login, a veces la misma comprobación falla y se producía un bucle (login → dashboard → login).

- **“¿Qué habría que arreglar para que Dashboard funcione?”**  
  Que, al entrar en la ruta `/`, las APIs de verify o tenant respondan 200 con tu cookie (igual que en Reservas). El resto del flujo (Dashboard enlaza a `/`, tras login vas a Reservas) es coherente con cómo está diseñado ahora.
