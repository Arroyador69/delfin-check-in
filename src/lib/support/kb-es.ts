import type { SupportKB } from './types';

export const KB_ES: SupportKB = {
  version: '2026-03-16',
  language: 'es',
  intro:
    'Eres el Asistente de Delfín Check-in. Ayudas SOLO con el uso del software (pantallas, botones, pasos). ' +
    'No hablas de código, arquitectura interna ni datos privados de huéspedes. ' +
    'Responde en español, con pasos cortos (máx. 8-12 líneas) y, si falta contexto, pide el mínimo: pantalla actual y objetivo.',
  faqs: [
    {
      q: '¿Qué es Delfín Check-in y para qué sirve?',
      a: 'Delfín Check-in te permite registrar huéspedes y gestionar el cumplimiento de envío al Ministerio del Interior (MIR), además de organizar propiedades/habitaciones y ver información útil (festivos/eventos/analítica).',
    },
    {
      q: '¿Cómo inicio sesión en el panel?',
      a: 'Entra en el panel de administración y usa tu email/contraseña. Si no tienes acceso, pide a tu administrador que te invite o revise tu cuenta.',
    },
    {
      q: 'No me deja entrar, ¿qué hago?',
      a: '1) Revisa email/contraseña. 2) Prueba cerrar sesión y volver a entrar. 3) Si sigue, pide reset de contraseña o que revisen tu tenant/usuario (puede estar desactivado).',
    },
    {
      q: '¿Qué es un tenant?',
      a: 'Es tu “espacio” dentro del sistema. Cada tenant tiene sus propiedades, huéspedes y configuración; no se mezcla con otros propietarios.',
    },
    {
      q: '¿Cómo configuro mis credenciales del MIR?',
      a: 'Ve a Configuración → MIR. Introduce: usuario MIR (CIF/NIF + ---WS), contraseña MIR y tu código de arrendador. Guarda. Si no lo tienes, debes obtenerlo desde el portal del MIR al dar de alta tu establecimiento.',
    },
    {
      q: '¿Dónde consigo el usuario del MIR?',
      a: 'En el portal oficial de hospedajes del MIR: https://hospedajes.ses.mir.es (ses.hospedajes). Al darte de alta como establecimiento con envío por web service, el MIR te asigna usuario y contraseña. El usuario suele ser tu CIF/NIF/NIE seguido de “---WS” (ejemplo: B12345678---WS).',
    },
    {
      q: '¿Qué es el “código de arrendador” del MIR?',
      a: 'Es un identificador único que te asigna el MIR al registrar el establecimiento en el portal de hospedajes (https://hospedajes.ses.mir.es). Lo ves en la ficha de tu alojamiento dentro del portal. Es obligatorio configurarlo en Delfín para que los envíos se acepten.',
    },
    {
      q: '¿Cómo sé si el MIR está en simulación o envío real?',
      a: 'Depende de la configuración del entorno (staging/producción) y variables del sistema. En tu panel MIR verás el estado de los envíos; si estás en pruebas, normalmente apuntará a preproducción.',
    },
    {
      q: 'He enviado un registro, ¿cómo confirmo que se ha enviado al MIR?',
      a: 'Entra en el panel MIR/Estado de envíos. Busca la comunicación asociada al huésped o a la fecha. Debe aparecer como enviada/aceptada o con error si falló.',
    },
    {
      q: '¿Qué significa “pendiente / enviado / error” en MIR?',
      a: 'Pendiente: aún no se ha enviado o está en cola. Enviado: se realizó el envío. Error: el MIR rechazó el payload o hubo un fallo; revisa el motivo y corrige el dato.',
    },
    {
      q: '¿Qué hago si el MIR devuelve error de formato?',
      a: 'Suele ser por un campo obligatorio mal formado (fecha, documento, INE/CP, etc.). Revisa el registro del huésped y corrige el dato exacto. Si el error no es claro, copia el mensaje de error y te digo qué campo suele fallar.',
    },
    {
      q: '¿Cómo registro un huésped desde el formulario público?',
      a: 'Comparte el enlace del formulario. El huésped rellena sus datos, firma y acepta términos. Al enviar, el registro aparece en tu panel automáticamente.',
    },
    {
      q: '¿Tienen que firmar todos los viajeros?',
      a: 'Sí: cada viajero debe firmar su parte cuando hay más de un viajero (según el flujo del formulario).',
    },
    {
      q: '¿Dónde veo las firmas del huésped?',
      a: 'En Registros de huéspedes → abre el detalle del registro. Si hay 2 viajeros, verás 2 firmas (Viajero 1 y Viajero 2).',
    },
    {
      q: '¿Cómo creo una propiedad o apartamento?',
      a: 'Ve a Propiedades (o Configuración → Propiedades). Pulsa “Añadir” y rellena los datos (nombre, dirección, etc.). Guarda.',
    },
    {
      q: '¿Cómo creo habitaciones/unidades?',
      a: 'En la propiedad, entra a Habitaciones/Unidades y pulsa “Añadir”. Define nombre, capacidad y detalles. Guarda.',
    },
    {
      q: '¿Cómo defino el número de viajeros en una estancia?',
      a: 'Al crear el registro o la reserva, indica cuántos viajeros hay y rellena los datos de cada uno. El sistema debe reflejar el número real de ocupantes.',
    },
    {
      q: '¿Puedo exportar registros?',
      a: 'Sí, desde la sección de exportación/descargas (según tu panel). Si necesitas un formato específico (CSV/XML), dime cuál.',
    },
    {
      q: '¿Qué es Market Intelligence?',
      a: 'Un módulo para ver festivos, eventos locales y analítica que te ayuda a tomar decisiones (por ejemplo, ajustar precios por demanda).',
    },
    {
      q: '¿Los festivos son por ciudad o por comunidad?',
      a: 'Ahora mismo: nacionales + comunidad autónoma seleccionada. Las fiestas locales municipales no están incluidas automáticamente.',
    },
    {
      q: '¿Cómo añado una feria o evento local?',
      a: 'En Market Intelligence → Eventos locales → “Añadir evento”. Pon título, fechas, ciudad, lugar e impacto. Guarda. Aparecerá en el calendario.',
    },
    {
      q: '¿Puedo tener eventos automáticos por ciudad?',
      a: 'Es una funcionalidad avanzada (Plan PRO) y requiere conectar fuentes externas (calendarios oficiales/servicios de eventos).',
    },
    {
      q: '¿Cómo funciona “Precios por zona”?',
      a: 'Muestra percentiles (P25/P40/P50/P75) de precios de mercado para una zona y fechas. Para datos reales necesita un proveedor externo (Plan PRO). En demo puede mostrarse como vista informativa.',
    },
    {
      q: 'No veo ninguna “zona” disponible en precios por zona, ¿por qué?',
      a: 'Porque no hay datos de mercado conectados. Cuando se active PRO con proveedor, aparecerán zonas disponibles automáticamente.',
    },
    {
      q: '¿Qué es P50 o percentil 50?',
      a: 'Es el “precio medio” del conjunto (mediana): la mitad de los precios están por debajo y la mitad por encima. P40 suele ser un ancla de mercado más conservadora.',
    },
    {
      q: '¿Qué hago si una página se queda cargando o falla?',
      a: '1) Recarga. 2) Cierra sesión y entra de nuevo. 3) Prueba en incógnito. 4) Si sigue, dime la pantalla y el mensaje exacto de error.',
    },
    {
      q: '¿Delfín Check-in guarda datos sensibles?',
      a: 'Guarda los datos necesarios para el registro legal y cumplimiento. No debes compartir enlaces o credenciales con terceros.',
    },
    {
      q: '¿El chatbot puede ver datos de huéspedes?',
      a: 'No. El Asistente solo explica cómo usar el software y configurarlo. No accede a datos privados.',
    },
    {
      q: '¿Puedo cambiar el idioma del panel?',
      a: 'Sí, desde el selector de idioma del panel (si está disponible) o en configuración de preferencias.',
    },
    {
      q: '¿Cómo invito a un usuario a mi cuenta?',
      a: 'Desde la sección de usuarios/equipo (si está habilitada). Si no la ves, lo gestiona el administrador del tenant.',
    },
    {
      q: '¿Cómo configuro Stripe/pagos?',
      a: 'La configuración de pagos depende del plan y del módulo de facturación. Si estás en demo, puede no estar activado. Si lo vas a activar, dime si usarás Stripe y te indico los pasos.',
    },
    {
      q: '¿Hay un modo “staging” para pruebas?',
      a: 'Sí. Staging se usa para pruebas antes de producción. En staging no deberías usar credenciales reales ni datos reales.',
    },
    {
      q: '¿Qué datos necesita el MIR de cada viajero?',
      a: 'Datos identificativos (documento, nombre, nacionalidad, fecha nacimiento) y datos de la estancia (fechas, establecimiento). Si me dices tu caso (español/extranjero), te indico lo típico que exige el formulario.',
    },
    {
      q: '¿Cómo evitar errores con INE y código postal?',
      a: 'El INE es un código distinto al CP. Normalmente el INE es de 5 dígitos y debe corresponder al municipio. Si el sistema valida INE/CP, revisa que coincidan con la provincia correcta.',
    },
    {
      q: '¿Qué hago si el huésped no puede firmar en el móvil?',
      a: 'Pide que gire la pantalla, use el dedo en el recuadro y no haga zoom. Si falla, probar otro navegador (Chrome/Safari).',
    },
    {
      q: '¿El formulario permite 2 viajeros?',
      a: 'Sí. Si añades un segundo viajero, aparece un segundo bloque de firma para el viajero 2.',
    },
    {
      q: '¿Puedo usarlo para apartamentos y para hotel?',
      a: 'Sí. El sistema se adapta a propiedades/habitaciones/unidades; lo importante es configurar bien la estructura y los viajeros por estancia.',
    },
    {
      q: 'Quiero soporte, ¿cómo contacto?',
      a: 'Para soporte general escribe a contacto@delfincheckin.com explicando tu duda o problema (idealmente con capturas de pantalla y el email de tu cuenta). Usamos ese correo como canal principal de soporte para la herramienta.',
    },
    {
      q: '¿Qué puedo enseñar en una demo rápida?',
      a: '1) Formulario público + firma. 2) Aparición en dashboard. 3) Estado de envío MIR. 4) Market Intelligence: festivos y eventos.',
    },
  ],
};

