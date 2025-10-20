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

for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(';');
    if (parts.length < 5) continue;
    
    const cpro = parts[1];
    const cmun = parts[2];
    const nombre = parts[4];
    
    if (!cpro || !cmun || !nombre) continue;
    
    const codigoINE = cpro + cmun;
    const provincia = provincias[cpro] || 'Desconocida';
    
    municipios.push({
        c: codigoINE,
        n: nombre,
        p: provincia
    });
}

console.log(`✅ Total de municipios procesados: ${municipios.length}`);

// Generar formato ULTRA-COMPACTO: todo en una línea, sin espacios innecesarios
let jsArray = 'const MUNICIPIOS_INE=[';

for (let i = 0; i < municipios.length; i++) {
    const m = municipios[i];
    // Escapar comillas simples en nombres
    const nombreEscapado = m.n.replace(/'/g, "\\'");
    jsArray += `{c:'${m.c}',n:'${nombreEscapado}',p:'${m.p}'}`;
    if (i < municipios.length - 1) {
        jsArray += ',';
    }
}

jsArray += '];';

// Guardar el archivo compacto
const outputPath = path.join(__dirname, 'municipios-ine-compacto.js');
fs.writeFileSync(outputPath, jsArray, 'utf-8');

const sizeKB = Math.round(Buffer.byteLength(jsArray, 'utf8') / 1024);
console.log(`✅ Archivo compacto generado: ${outputPath}`);
console.log(`📊 Tamaño: ${sizeKB} KB`);
console.log(`📊 Total: ${municipios.length} municipios`);

// Verificar municipios específicos
console.log(`\n🔍 Verificando municipios clave:`);
const testMunicipios = ['estepona', 'dos hermanas', 'fuengirola', 'marbella', 'madrid', 'barcelona', 'valencia', 'sevilla'];
testMunicipios.forEach(test => {
    const found = municipios.find(m => m.n.toLowerCase().includes(test));
    if (found) {
        console.log(`✅ ${test}: ${found.c} - ${found.n} (${found.p})`);
    } else {
        console.log(`❌ ${test}: NO ENCONTRADO`);
    }
});

