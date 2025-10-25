/**
 * 🤖 PROMPT DETERMINISTA PARA TELEGRAM BOT
 * 
 * Prompt ultra-determinista para evitar alucinaciones de IA
 * La IA solo formatea, no interpreta ni inventa datos
 */

export const TELEGRAM_FACTUAL_PROMPT = `
Recibirás un JSON con tres listas: "alojados", "llegan" y "salen".
Tu única tarea es mostrarlo en formato legible, sin añadir ni deducir datos.
No inventes ni mezcles grupos, no crees nuevos nombres ni reservas.

Usa el formato exacto siguiente:

📅 Estado de reservas para el {fecha_consulta}

🏠 Actualmente alojados:
{lista_alojados}

🟢 Llegadas de hoy:
{lista_llegan}

🔴 Salidas de hoy:
{lista_salen}

FORMATO DE CADA ELEMENTO:
- [nombre] (Hab. [habitacion], [personas] pers., Check-in [check_in], Check-out [check_out])

Si una lista está vacía, indícalo con "—".

EJEMPLO:
🏠 Actualmente alojados:
- María Pérez (Hab. 101, 2 pers., Check-in 2025-10-22, Check-out 2025-10-27)

🟢 Llegadas de hoy:
- Carlos Gómez (Hab. 103, 3 pers., Check-in 2025-10-24, Check-out 2025-10-26)

🔴 Salidas de hoy:
- Ana López (Hab. 102, 2 pers., Check-in 2025-10-21, Check-out 2025-10-24)

REGLAS ESTRICTAS:
1. NO inventes datos
2. NO mezcles grupos
3. NO añadas reservas que no estén en el JSON
4. NO cambies nombres, habitaciones o fechas
5. Si faltan datos, muestra "—" en lugar de inventar
`;

/**
 * Formatea los datos estructurados usando el prompt determinista
 */
export function formatReservasForTelegram(data: {
  fecha_consulta: string;
  alojados: Array<{
    nombre: string;
    habitacion: string;
    personas: number;
    check_in: string;
    check_out: string;
  }>;
  llegan: Array<{
    nombre: string;
    habitacion: string;
    personas: number;
    check_in: string;
    check_out: string;
  }>;
  salen: Array<{
    nombre: string;
    habitacion: string;
    personas: number;
    check_in: string;
    check_out: string;
  }>;
}): string {
  const formatLista = (lista: typeof data.alojados) => {
    if (lista.length === 0) return "—";
    return lista.map(item => 
      `- ${item.nombre} (Hab. ${item.habitacion}, ${item.personas} pers., Check-in ${item.check_in}, Check-out ${item.check_out})`
    ).join('\n');
  };

  const fechaFormateada = new Date(data.fecha_consulta).toLocaleDateString('es-ES');

  return `📅 Estado de reservas para el ${fechaFormateada}

🏠 Actualmente alojados:
${formatLista(data.alojados)}

🟢 Llegadas de hoy:
${formatLista(data.llegan)}

🔴 Salidas de hoy:
${formatLista(data.salen)}`;
}

/**
 * Configuración para OpenAI con modo factual
 */
export const OPENAI_FACTUAL_CONFIG = {
  temperature: 0,
  response_format: { type: "text" },
  max_tokens: 1000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};
