const fs = require('fs');
const path = require('path');

// Leer el archivo CSV principal
const csvPath = path.join(__dirname, 'municipios por provincipia e isla con sus codigos', 'municipios por provincia con sus codigos ine .csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Mapa de códigos de provincia a nombres de provincia
const provincias = {
    '01': 'Álava', '02': 'Albacete', '03': 'Alicante', '04': 'Almería',
    '05': 'Ávila', '06': 'Badajoz', '07': 'Islas Baleares', '08': 'Barcelona',
    '09': 'Burgos', '10': 'Cáceres', '11': 'Cádiz', '12': 'Castellón',
    '13': 'Ciudad Real', '14': 'Córdoba', '15': 'A Coruña', '16': 'Cuenca',
    '17': 'Girona', '18': 'Granada', '19': 'Guadalajara', '20': 'Guipúzcoa',
    '21': 'Huelva', '22': 'Huesca', '23': 'Jaén', '24': 'León',
    '25': 'Lleida', '26': 'La Rioja', '27': 'Lugo', '28': 'Madrid',
    '29': 'Málaga', '30': 'Murcia', '31': 'Navarra', '32': 'Ourense',
    '33': 'Asturias', '34': 'Palencia', '35': 'Las Palmas', '36': 'Pontevedra',
    '37': 'Salamanca', '38': 'Santa Cruz de Tenerife', '39': 'Cantabria', '40': 'Segovia',
    '41': 'Sevilla', '42': 'Soria', '43': 'Tarragona', '44': 'Teruel',
    '45': 'Toledo', '46': 'Valencia', '47': 'Valladolid', '48': 'Vizcaya',
    '49': 'Zamora', '50': 'Zaragoza', '51': 'Ceuta', '52': 'Melilla'
};

// Procesar el CSV
const lines = csvContent.split('\n');
const municipios = [];

for (let i = 2; i < lines.length; i++) { // Saltar las primeras 2 líneas (encabezados)
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(';');
    if (parts.length < 5) continue;
    
    const codAuto = parts[0];
    const cpro = parts[1];
    const cmun = parts[2];
    const dc = parts[3];
    const nombre = parts[4];
    
    if (!cpro || !cmun || !nombre) continue;
    
    // Código INE completo: CPRO + CMUN (5 dígitos)
    const codigoINE = cpro + cmun;
    const provincia = provincias[cpro] || 'Desconocida';
    
    municipios.push({
        c: codigoINE,
        n: nombre,
        p: provincia
    });
}

console.log(`✅ Total de municipios procesados: ${municipios.length}`);

// Generar el archivo JavaScript compacto
let jsArray = 'const MUNICIPIOS_INE_COMPLETO = [\n';

// Agrupar por provincia para mejor legibilidad
let currentProvincia = '';
for (let i = 0; i < municipios.length; i++) {
    const m = municipios[i];
    const provincia = m.p;
    
    if (provincia !== currentProvincia) {
        if (i > 0) jsArray += '\n';
        jsArray += `  // ${provincia}\n`;
        currentProvincia = provincia;
    }
    
    const item = `  {c:'${m.c}',n:'${m.n}',p:'${m.p}'}`;
    jsArray += item;
    
    if (i < municipios.length - 1) {
        jsArray += ',';
    }
    jsArray += '\n';
}

jsArray += '];\n';

// Guardar el archivo
const outputPath = path.join(__dirname, 'municipios-ine-completo.js');
fs.writeFileSync(outputPath, jsArray, 'utf-8');

console.log(`✅ Archivo generado: ${outputPath}`);
console.log(`📊 Total: ${municipios.length} municipios`);

console.log(`\n🔍 Verificando municipios específicos:`);
const estepona = municipios.find(m => m.n.toLowerCase().includes('estepona'));
const dosHermanas = municipios.find(m => m.n.toLowerCase().includes('dos hermanas'));
const fuengirola = municipios.find(m => m.n.toLowerCase().includes('fuengirola'));
const madrid = municipios.find(m => m.n === 'Madrid');
const barcelona = municipios.find(m => m.n === 'Barcelona');

console.log('✅ Estepona:', estepona);
console.log('✅ Dos Hermanas:', dosHermanas);
console.log('✅ Fuengirola:', fuengirola);
console.log('✅ Madrid:', madrid);
console.log('✅ Barcelona:', barcelona);
