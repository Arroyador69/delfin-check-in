const { Worker } = require('bullmq');
const Redis = require('ioredis');

// Configuración de Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

console.log('🚀 Iniciando workers de Delfín Check-in...');

// Worker para sincronización iCal
const icalSyncWorker = new Worker('ical-sync', async (job) => {
  console.log(`📅 Procesando sincronización iCal para habitación: ${job.data.roomId}`);
  
  try {
    // Aquí iría la lógica de sincronización iCal
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulación
    
    console.log(`✅ Sincronización iCal completada para habitación: ${job.data.roomId}`);
    return { success: true, roomId: job.data.roomId };
  } catch (error) {
    console.error(`❌ Error en sincronización iCal:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5
});

// Worker para notificaciones de nuevas reservas
const newReservationWorker = new Worker('new-reservation-notification', async (job) => {
  console.log(`🔔 Enviando notificación de nueva reserva: ${job.data.reservationId}`);
  
  try {
    // Aquí iría la lógica de envío de notificaciones
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
    
    console.log(`✅ Notificación enviada para reserva: ${job.data.reservationId}`);
    return { success: true, reservationId: job.data.reservationId };
  } catch (error) {
    console.error(`❌ Error enviando notificación:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 10
});

// Worker para envío de mensajes
const messagesWorker = new Worker('messages', async (job) => {
  console.log(`📧 Enviando mensaje: ${job.data.type}`);
  
  try {
    // Aquí iría la lógica de envío de mensajes
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulación
    
    console.log(`✅ Mensaje enviado: ${job.data.type}`);
    return { success: true, type: job.data.type };
  } catch (error) {
    console.error(`❌ Error enviando mensaje:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5
});

// Worker para generación de PDFs
const pdfGenerationWorker = new Worker('pdf-generation', async (job) => {
  console.log(`📄 Generando PDF: ${job.data.type}`);
  
  try {
    // Aquí iría la lógica de generación de PDFs
    await new Promise(resolve => setTimeout(resolve, 3000)); // Simulación
    
    console.log(`✅ PDF generado: ${job.data.type}`);
    return { success: true, type: job.data.type, url: 'https://example.com/pdf.pdf' };
  } catch (error) {
    console.error(`❌ Error generando PDF:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 3
});

// Worker para notificaciones de Telegram
const telegramWorker = new Worker('telegram-notifications', async (job) => {
  console.log(`🤖 Enviando notificación Telegram: ${job.data.type}`);
  
  try {
    // Aquí iría la lógica de envío a Telegram
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulación
    
    console.log(`✅ Notificación Telegram enviada: ${job.data.type}`);
    return { success: true, type: job.data.type };
  } catch (error) {
    console.error(`❌ Error enviando notificación Telegram:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 5
});

// Worker para sincronización periódica
const periodicSyncWorker = new Worker('periodic-sync', async (job) => {
  console.log(`🔄 Ejecutando sincronización periódica`);
  
  try {
    // Aquí iría la lógica de sincronización periódica
    await new Promise(resolve => setTimeout(resolve, 5000)); // Simulación
    
    console.log(`✅ Sincronización periódica completada`);
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error(`❌ Error en sincronización periódica:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 1
});

// Manejo de errores para todos los workers
[icalSyncWorker, newReservationWorker, messagesWorker, pdfGenerationWorker, telegramWorker, periodicSyncWorker].forEach(worker => {
  worker.on('error', (error) => {
    console.error(`❌ Error en worker ${worker.name}:`, error);
  });
  
  worker.on('completed', (job) => {
    console.log(`✅ Job completado en ${worker.name}:`, job.id);
  });
  
  worker.on('failed', (job, error) => {
    console.error(`❌ Job fallido en ${worker.name}:`, job.id, error);
  });
});

console.log('✅ Todos los workers iniciados correctamente');

// Manejo de señales para cierre graceful
process.on('SIGTERM', async () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando workers...');
  
  await Promise.all([
    icalSyncWorker.close(),
    newReservationWorker.close(),
    messagesWorker.close(),
    pdfGenerationWorker.close(),
    telegramWorker.close(),
    periodicSyncWorker.close(),
    redis.quit()
  ]);
  
  console.log('✅ Workers cerrados correctamente');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Recibida señal SIGINT, cerrando workers...');
  
  await Promise.all([
    icalSyncWorker.close(),
    newReservationWorker.close(),
    messagesWorker.close(),
    pdfGenerationWorker.close(),
    telegramWorker.close(),
    periodicSyncWorker.close(),
    redis.quit()
  ]);
  
  console.log('✅ Workers cerrados correctamente');
  process.exit(0);
});
