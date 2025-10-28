// Catálogo de los principales municipios españoles con códigos INE
// Se puede ampliar según necesidad

export interface Municipio {
  codigo: string;
  nombre: string;
  provincia: string;
  cp?: string; // Código postal de referencia
}

export const MUNICIPIOS_PRINCIPALES: Municipio[] = [
  // Málaga
  { codigo: '29067', nombre: 'Málaga', provincia: 'Málaga', cp: '29001' },
  { codigo: '29042', nombre: 'Fuengirola', provincia: 'Málaga', cp: '29640' },
  { codigo: '29069', nombre: 'Marbella', provincia: 'Málaga', cp: '29600' },
  { codigo: '29094', nombre: 'Torremolinos', provincia: 'Málaga', cp: '29620' },
  { codigo: '29015', nombre: 'Benalmádena', provincia: 'Málaga', cp: '29630' },
  { codigo: '29054', nombre: 'Mijas', provincia: 'Málaga', cp: '29650' },
  { codigo: '29025', nombre: 'Estepona', provincia: 'Málaga', cp: '29680' },
  { codigo: '29003', nombre: 'Antequera', provincia: 'Málaga', cp: '29200' },
  { codigo: '29106', nombre: 'Vélez-Málaga', provincia: 'Málaga', cp: '29700' },
  
  // Madrid
  { codigo: '28079', nombre: 'Madrid', provincia: 'Madrid', cp: '28001' },
  { codigo: '28065', nombre: 'Móstoles', provincia: 'Madrid', cp: '28931' },
  { codigo: '28047', nombre: 'Alcalá de Henares', provincia: 'Madrid', cp: '28801' },
  { codigo: '28074', nombre: 'Fuenlabrada', provincia: 'Madrid', cp: '28940' },
  { codigo: '28092', nombre: 'Leganés', provincia: 'Madrid', cp: '28911' },
  { codigo: '28006', nombre: 'Alcorcón', provincia: 'Madrid', cp: '28921' },
  { codigo: '28058', nombre: 'Getafe', provincia: 'Madrid', cp: '28901' },
  { codigo: '28161', nombre: 'Torrejón de Ardoz', provincia: 'Madrid', cp: '28850' },
  
  // Barcelona
  { codigo: '08019', nombre: 'Barcelona', provincia: 'Barcelona', cp: '08001' },
  { codigo: '08101', nombre: 'Hospitalet de Llobregat, L\'', provincia: 'Barcelona', cp: '08901' },
  { codigo: '08015', nombre: 'Badalona', provincia: 'Barcelona', cp: '08911' },
  { codigo: '08187', nombre: 'Sabadell', provincia: 'Barcelona', cp: '08201' },
  { codigo: '08184', nombre: 'Terrassa', provincia: 'Barcelona', cp: '08221' },
  { codigo: '08245', nombre: 'Santa Coloma de Gramenet', provincia: 'Barcelona', cp: '08921' },
  { codigo: '08169', nombre: 'Mataró', provincia: 'Barcelona', cp: '08301' },
  
  // Valencia
  { codigo: '46250', nombre: 'Valencia', provincia: 'Valencia', cp: '46001' },
  { codigo: '46131', nombre: 'Gandia', provincia: 'Valencia', cp: '46700' },
  { codigo: '46244', nombre: 'Torrent', provincia: 'Valencia', cp: '46900' },
  { codigo: '46102', nombre: 'Paterna', provincia: 'Valencia', cp: '46980' },
  
  // Sevilla
  { codigo: '41091', nombre: 'Sevilla', provincia: 'Sevilla', cp: '41001' },
  { codigo: '41038', nombre: 'Dos Hermanas', provincia: 'Sevilla', cp: '41700' },
  { codigo: '41004', nombre: 'Alcalá de Guadaíra', provincia: 'Sevilla', cp: '41500' },
  
  // Alicante
  { codigo: '03014', nombre: 'Alicante/Alacant', provincia: 'Alicante', cp: '03001' },
  { codigo: '03065', nombre: 'Elche/Elx', provincia: 'Alicante', cp: '03201' },
  { codigo: '03101', nombre: 'Orihuela', provincia: 'Alicante', cp: '03300' },
  { codigo: '03139', nombre: 'Torrevieja', provincia: 'Alicante', cp: '03181' },
  { codigo: '03030', nombre: 'Benidorm', provincia: 'Alicante', cp: '03501' },
  
  // Zaragoza
  { codigo: '50297', nombre: 'Zaragoza', provincia: 'Zaragoza', cp: '50001' },
  
  // Bilbao
  { codigo: '48020', nombre: 'Bilbao', provincia: 'Bizkaia', cp: '48001' },
  { codigo: '48015', nombre: 'Barakaldo', provincia: 'Bizkaia', cp: '48901' },
  
  // Asturias
  { codigo: '33044', nombre: 'Oviedo', provincia: 'Asturias', cp: '33001' },
  { codigo: '33024', nombre: 'Gijón', provincia: 'Asturias', cp: '33201' },
  
  // Murcia
  { codigo: '30030', nombre: 'Murcia', provincia: 'Murcia', cp: '30001' },
  { codigo: '30016', nombre: 'Cartagena', provincia: 'Murcia', cp: '30201' },
  
  // Palmas (Gran Canaria)
  { codigo: '35016', nombre: 'Palmas de Gran Canaria, Las', provincia: 'Las Palmas', cp: '35001' },
  
  // Santa Cruz de Tenerife
  { codigo: '38038', nombre: 'Santa Cruz de Tenerife', provincia: 'Santa Cruz de Tenerife', cp: '38001' },
  
  // Granada
  { codigo: '18087', nombre: 'Granada', provincia: 'Granada', cp: '18001' },
  
  // Córdoba
  { codigo: '14021', nombre: 'Córdoba', provincia: 'Córdoba', cp: '14001' },
  
  // Valladolid
  { codigo: '47186', nombre: 'Valladolid', provincia: 'Valladolid', cp: '47001' },
  
  // Vigo
  { codigo: '36057', nombre: 'Vigo', provincia: 'Pontevedra', cp: '36201' },
  
  // Gijón ya está arriba
  
  // La Coruña
  { codigo: '15030', nombre: 'Coruña, A', provincia: 'A Coruña', cp: '15001' },
  
  // Vitoria
  { codigo: '01059', nombre: 'Vitoria-Gasteiz', provincia: 'Álava', cp: '01001' },
  
  // Palma de Mallorca
  { codigo: '07040', nombre: 'Palma', provincia: 'Illes Balears', cp: '07001' },
  
  // Cádiz
  { codigo: '11012', nombre: 'Cádiz', provincia: 'Cádiz', cp: '11001' },
  { codigo: '11020', nombre: 'Jerez de la Frontera', provincia: 'Cádiz', cp: '11401' },
  
  // Más ciudades principales...
];

export function buscarMunicipio(texto: string): Municipio[] {
  const textoNorm = texto.toLowerCase().trim();
  if (!textoNorm) return MUNICIPIOS_PRINCIPALES.slice(0, 20);
  
  return MUNICIPIOS_PRINCIPALES.filter(m => 
    m.nombre.toLowerCase().includes(textoNorm) ||
    m.provincia.toLowerCase().includes(textoNorm) ||
    m.codigo.includes(textoNorm)
  ).slice(0, 50);
}

export function obtenerINEPorNombre(nombre: string): string | null {
  const municipio = MUNICIPIOS_PRINCIPALES.find(m => 
    m.nombre.toLowerCase() === nombre.toLowerCase()
  );
  return municipio?.codigo || null;
}
