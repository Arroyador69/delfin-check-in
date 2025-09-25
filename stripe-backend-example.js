// ===== BACKEND STRIPE - EJEMPLO PARA NODE.JS =====
// Este archivo es un ejemplo de cómo implementar el backend para Stripe

const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint para crear Payment Intent
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { plan, properties, email, name } = req.body;
    
    // Calcular el precio según el plan
    let amount;
    if (plan === 'monthly') {
      amount = properties * 400; // 4€ en céntimos
    } else if (plan === 'yearly') {
      amount = properties * 4000; // 40€ en céntimos
    } else {
      return res.status(400).json({ error: 'Plan no válido' });
    }
    
    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'eur',
      metadata: {
        plan: plan,
        properties: properties.toString(),
        email: email,
        name: name
      },
      description: `Delfín Check-in - ${plan === 'monthly' ? 'Plan Mensual' : 'Plan Anual'} - ${properties} propiedades`,
    });
    
    res.json({
      client_secret: paymentIntent.client_secret
    });
    
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para webhooks de Stripe (opcional)
app.post('/stripe-webhook', express.raw({type: 'application/json'}), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Manejar eventos de pago
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    console.log('Pago exitoso:', paymentIntent.id);
    
    // Aquí puedes:
    // - Crear la cuenta de usuario
    // - Enviar email de confirmación
    // - Activar la suscripción
    // - Guardar en base de datos
  }
  
  res.json({received: true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

// ===== VARIABLES DE ENTORNO NECESARIAS =====
/*
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PORT=3000
*/

// ===== COMANDOS PARA INSTALAR =====
/*
npm init -y
npm install express stripe cors
npm install -g nodemon
nodemon stripe-backend-example.js
*/
