/**
 * 📅 PARSER INTELIGENTE DE FECHAS PARA TELEGRAM
 * 
 * Extrae fechas de texto natural en español
 * Soporta: "mañana", "ayer", "27 de octubre", "30", etc.
 */

interface ParseDateResult {
  fecha: string; // YYYY-MM-DD
  esValida: boolean;
  tipo: 'hoy' | 'ayer' | 'mañana' | 'especifica' | 'default';
}

/**
 * Parsear fecha desde texto
 */
export function parseDateFromText(text: string): ParseDateResult {
  const textLower = text.toLowerCase().trim();
  const today = new Date();
  
  // 1. Días relativos simples
  if (textLower.includes('mañana')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return {
      fecha: tomorrow.toISOString().split('T')[0],
      esValida: true,
      tipo: 'mañana'
    };
  }
  
  if (textLower.includes('ayer')) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      fecha: yesterday.toISOString().split('T')[0],
      esValida: true,
      tipo: 'ayer'
    };
  }
  
  if (textLower.includes('hoy') || textLower === '') {
    return {
      fecha: today.toISOString().split('T')[0],
      esValida: true,
      tipo: 'hoy'
    };
  }
  
  // 2. Días específicos: "27", "30", etc. (asume mes actual)
  const dayMatch = textLower.match(/\b(\d{1,2})\b/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    if (day >= 1 && day <= 31) {
      const fechaEspecifica = new Date(today.getFullYear(), today.getMonth(), day);
      // Validar que no sea una fecha pasada (a menos que sea del mes siguiente)
      if (fechaEspecifica < today) {
        fechaEspecifica.setMonth(fechaEspecifica.getMonth() + 1);
      }
      return {
        fecha: fechaEspecifica.toISOString().split('T')[0],
        esValida: true,
        tipo: 'especifica'
      };
    }
  }
  
  // 3. Fechas con mes: "27 de octubre", "30 de diciembre", etc.
  const meses = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
  };
  
  for (const [mesStr, mes] of Object.entries(meses)) {
    if (textLower.includes(mesStr)) {
      const dayMatch = textLower.match(/\b(\d{1,2})\b/);
      if (dayMatch) {
        const day = parseInt(dayMatch[1]);
        if (day >= 1 && day <= 31) {
          let año = today.getFullYear();
          const fechaEspecifica = new Date(año, mes, day);
          // Si ya pasó este año, usar el próximo año
          if (fechaEspecifica < today) {
            año += 1;
            fechaEspecifica.setFullYear(año);
          }
          return {
            fecha: fechaEspecifica.toISOString().split('T')[0],
            esValida: true,
            tipo: 'especifica'
          };
        }
      }
    }
  }
  
  // 4. Fechas en formato ISO o corto: "2025-10-27", "27/10/2025"
  const isoMatch = textLower.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(fecha.getTime())) {
      return {
        fecha: `${year}-${month}-${day}`,
        esValida: true,
        tipo: 'especifica'
      };
    }
  }
  
  const shortMatch = textLower.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (shortMatch) {
    const [, day, month, year] = shortMatch;
    const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(fecha.getTime())) {
      const fechaStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      return {
        fecha: fechaStr,
        esValida: true,
        tipo: 'especifica'
      };
    }
  }
  
  // 5. Por defecto, usar hoy
  return {
    fecha: today.toISOString().split('T')[0],
    esValida: true,
    tipo: 'default'
  };
}

/**
 * Formatear fecha para mostrar al usuario
 */
export function formatDateForUser(fecha: string): string {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}
