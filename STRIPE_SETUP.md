# 💳 Configuración de Stripe para Delfín Check-in

## 🚀 Pasos para implementar pagos con Stripe

### 1. Crear cuenta en Stripe
1. Ve a [stripe.com](https://stripe.com)
2. Crea una cuenta gratuita
3. Completa la verificación de identidad
4. Activa tu cuenta

### 2. Obtener las claves API
1. Ve al **Dashboard de Stripe**
2. En el menú lateral, selecciona **"Developers" > "API keys"**
3. Copia tu **clave pública** (pk_test_...) y **clave secreta** (sk_test_...)

### 3. Configurar el frontend
En `index.html`, línea 909, reemplaza:
```javascript
const stripe = Stripe('pk_test_51234567890abcdef...'); // Cambiar por tu clave real
```

Por tu clave pública real:
```javascript
const stripe = Stripe('pk_test_tu_clave_real_aqui');
```

### 4. Configurar el backend
1. **Instala Node.js** si no lo tienes
2. **Crea un archivo** `package.json`:
```json
{
  "name": "delfin-checkin-backend",
  "version": "1.0.0",
  "main": "stripe-backend-example.js",
  "scripts": {
    "start": "node stripe-backend-example.js",
    "dev": "nodemon stripe-backend-example.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "stripe": "^14.0.0",
    "cors": "^2.8.5"
  }
}
```

3. **Instala las dependencias**:
```bash
npm install
```

4. **Crea archivo** `.env`:
```
STRIPE_SECRET_KEY=sk_test_tu_clave_secreta_aqui
STRIPE_WEBHOOK_SECRET=whsec_tu_webhook_secret_aqui
PORT=3000
```

5. **Ejecuta el servidor**:
```bash
npm start
```

### 5. Configurar webhooks (opcional)
1. En Stripe Dashboard, ve a **"Developers" > "Webhooks"**
2. Añade endpoint: `https://tu-dominio.com/stripe-webhook`
3. Selecciona eventos: `payment_intent.succeeded`
4. Copia el **Webhook Secret** a tu archivo `.env`

### 6. Probar pagos
1. **Modo test**: Usa tarjetas de prueba de Stripe
   - **Éxito**: `4242 4242 4242 4242`
   - **Declinada**: `4000 0000 0000 0002`
   - **Cualquier fecha futura** y **CVC**

2. **Modo producción**: Cambia a claves live (pk_live_... y sk_live_...)

## 🔧 Funcionalidades implementadas

### ✅ Frontend (index.html)
- **Modal de pago** con Stripe Elements
- **Formulario de facturación** completo
- **Validación** de campos
- **Cálculo automático** de precios
- **Manejo de errores** de tarjeta
- **Spinner de carga** durante el pago

### ✅ Backend (stripe-backend-example.js)
- **Creación de Payment Intent**
- **Cálculo de precios** por plan y propiedades
- **Metadata** del pago
- **Webhooks** para confirmación
- **Manejo de errores**

## 💰 Precios configurados
- **Plan Mensual**: 4€ por propiedad
- **Plan Anual**: 40€ por propiedad (ahorro de 8€)
- **Múltiples propiedades**: Se multiplica automáticamente

## 🔒 Seguridad
- **PCI DSS compliant** (Stripe maneja los datos de tarjeta)
- **Cifrado SSL/TLS** en todas las comunicaciones
- **Validación** en frontend y backend
- **Webhooks** para confirmación segura

## 📧 Después del pago exitoso
El sistema puede:
1. **Crear cuenta** de usuario automáticamente
2. **Enviar email** de confirmación
3. **Activar suscripción** en la base de datos
4. **Redirigir** al dashboard del usuario

## 🆘 Soporte
- **Documentación Stripe**: [stripe.com/docs](https://stripe.com/docs)
- **Test cards**: [stripe.com/docs/testing](https://stripe.com/docs/testing)
- **Webhooks**: [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)

## ⚠️ Importante
- **Nunca** expongas tu clave secreta en el frontend
- **Siempre** valida los pagos en el backend
- **Usa HTTPS** en producción
- **Configura webhooks** para confirmación
