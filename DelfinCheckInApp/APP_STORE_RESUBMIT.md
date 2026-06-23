# Reenvío App Store — checklist (v1.1.3)

Rechazo **1.1.2 (6)** — dos guidelines. Hacer **código + App Store Connect** antes de resubmitir.

## A) Guideline 5.1.2(i) — Privacidad / tracking (sin cambio de código obligatorio)

La app **no hace tracking** (sin AdMob, sin Facebook SDK, sin IDFA, sin ATT).

### En App Store Connect (Account Holder / Admin)

1. **App Privacy** → Editar.
2. Pregunta **«¿Usáis datos para hacer tracking?»** → **No**.
3. Eliminar en todos los tipos de dato:
   - **Publicidad de terceros**
   - **Usado para tracking**
4. **Ubicación aproximada**: eliminar del cuestionario si la app no pide GPS (no la pide).
5. **Device ID**: quitar «tracking» y «publicidad»; si no usáis identificador de dispositivo para ads, valorar eliminar el tipo.
6. Guardar y publicar la nueva ficha.

### Responder a Apple (App Store Connect → mensaje del rechazo)

> We do not track users. We updated App Privacy labels to reflect that the app does not use data for tracking. The app does not use AdMob, Facebook SDK, or IDFA, and does not implement App Tracking Transparency because no cross-app tracking occurs. Privacy manifest: NSPrivacyTracking = false.

---

## B) Guideline 3.1.1 — Sin registro ni compra externa en iOS (código v1.1.3)

### Cambios en la app

- Login **solo** cuenta existente (sin abrir onboarding web tras login).
- Sin banner «Abrir onboarding en el navegador» en iOS.
- Sin botones «Mejorar plan» / checkout web en iOS (Ajustes, MIR, Reputación, Facturación).
- Sin tarjetas de afiliado Amazon en iOS.
- Texto legal sin mención a Polar/checkout en iOS.

### Review Notes (al enviar 1.1.3)

> This is a companion app for existing hospitality business customers. Account creation and subscription purchase happen only on our website (delfincheckin.com / admin.delfincheckin.com), not in the iOS app. The iOS app provides sign-in for existing accounts and property management (reservations, guest registration, MIR settings). There is no in-app registration, no subscription purchase UI, and no external payment links for the SaaS subscription on iOS. Test account: [EMAIL] / [PASSWORD].

Proporcionar **cuenta de prueba** con datos reales (reservas, MIR configurado si es posible).

### Ficha App Store (descripción)

- No decir «regístrate aquí», «prueba gratis», «planes desde X€».
- Decir: «Inicia sesión con tu cuenta de Delfín Check-in».

---

## C) Build y submit

```bash
cd DelfinCheckInApp
npm install
eas build -p ios --profile production
eas submit -p ios --profile production --latest
```

O Archive en Xcode desde `ios/DelfnCheckin.xcworkspace` (versión **1.1.3**, build **7**).

---

## D) Verificación manual en iPhone/iPad antes de enviar

- [ ] Login: solo email + contraseña + texto «cuenta creada en delfincheckin.com»
- [ ] Tras login: **no** se abre Safari/onboarding automático
- [ ] Dashboard: **no** banner naranja de onboarding web
- [ ] Ajustes: **no** botón «Mejorar plan»; texto plan gestionado en web
- [ ] MIR / Reputación: **no** CTA de upgrade
- [ ] **No** tarjetas Amazon/afiliado
- [ ] Olvidé contraseña: OK (recuperación, no es registro)
