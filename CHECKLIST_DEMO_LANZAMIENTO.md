## ✅ Checklist demo Delfín Check‑in

Pensado para revisar rápido antes de enseñar la demo a nadie.

### 1. Formulario público + MIR

- [ ] Abrir el formulario público (staging o producción de prueba).
- [ ] Completar un registro realista con 1–2 viajeros.
- [ ] Verificar que:
  - [ ] Se crea el registro en el dashboard de `Registros de huéspedes`.
  - [ ] Se genera/actualiza la comunicación MIR correspondiente (en el panel MIR o logs).

### 2. Multi‑tenant y datos

- [ ] Entrar con un tenant de pruebas y confirmar que:
  - [ ] Solo ve sus propios registros de huéspedes.
  - [ ] Solo ve sus propias propiedades / habitaciones.
- [ ] Si hay más de un tenant de prueba, comprobar que los datos no se mezclan.

### 3. Market Intelligence (demo)

- [ ] Pestaña **Calendario**:
  - [ ] Se cargan festivos nacionales y de la comunidad autónoma seleccionada.
  - [ ] Se ven los eventos locales que hayas creado (si hay).
- [ ] Pestaña **Eventos locales**:
  - [ ] Puedes crear, editar y borrar un evento sin errores.
- [ ] Pestaña **Precios por zona**:
  - [ ] La UI carga sin errores.
  - [ ] El mensaje explica que los datos de precios de competencia se activarán en el plan PRO con proveedor externo.

### 4. Seguridad básica y estabilidad

- [ ] Probar login y logout:
  - [ ] Sin sesión no puedes entrar al panel de administración.
- [ ] Navegar por las páginas principales:
  - [ ] Dashboard, Registros, MIR, Market Intelligence, Configuración.
  - [ ] No aparecen errores 500 en la consola ni en la UI.
- [ ] Confirmar que no hay datos sensibles en la URL ni en mensajes de error.

### 5. Entornos: staging vs producción

- [ ] Confirmar que:
  - [ ] `staging.delfincheckin.com` usa base de datos de **staging** (Neon proyecto de pruebas).
  - [ ] `admin.delfincheckin.com` usa base de datos de **producción**.
- [ ] Verificar que los cambios nuevos primero se ven en **staging** y solo después en **producción**.

### 6. Comunicación para la demo

- [ ] Tener claro el relato:
  - [ ] Problema: multas y fricción con MIR.
  - [ ] Solución: flujo completo registro → envío MIR → control en dashboard.
  - [ ] Extra: calendario de festivos + eventos locales para decidir precios.
- [ ] Tener a mano:
  - [ ] URLs de demo (formulario público y admin).
  - [ ] Usuario/contraseña de tenant demo.

