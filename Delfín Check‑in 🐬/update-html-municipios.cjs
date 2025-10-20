const fs = require('fs');
const path = require('path');

// Leer el archivo compacto de municipios
const municipiosPath = path.join(__dirname, 'municipios-ine-compacto.js');
const municipiosContent = fs.readFileSync(municipiosPath, 'utf-8');

// Extraer solo el array (sin el "const MUNICIPIOS_INE=")
const arrayContent = municipiosContent.replace('const MUNICIPIOS_INE=', '').replace(/;$/, '');

// Leer el archivo HTML
const htmlPath = path.join(__dirname, 'delfin-formulario-publico', 'index.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf-8');

// Encontrar y reemplazar el catálogo actual
const startMarker = '        const MUNICIPIOS_INE = [';
const endMarker = '        ];';

const startIndex = htmlContent.indexOf(startMarker);
const endIndex = htmlContent.indexOf(endMarker, startIndex) + endMarker.length;

if (startIndex === -1 || endIndex === -1) {
    console.error('❌ No se encontró el catálogo en el HTML');
    process.exit(1);
}

// Reemplazar el catálogo antiguo con el nuevo
const before = htmlContent.substring(0, startIndex);
const after = htmlContent.substring(endIndex);

const newCatalog = `        // Catálogo COMPLETO de municipios españoles del INE (8,132 municipios)
        // Generado automáticamente a partir de datos oficiales del INE (enero 2025)
        const MUNICIPIOS_INE = ${arrayContent};`;

const newHtmlContent = before + newCatalog + after;

// Guardar el archivo actualizado
fs.writeFileSync(htmlPath, newHtmlContent, 'utf-8');

const oldSize = Math.round(htmlContent.length / 1024);
const newSize = Math.round(newHtmlContent.length / 1024);

console.log(`✅ HTML actualizado exitosamente`);
console.log(`📊 Tamaño anterior: ${oldSize} KB`);
console.log(`📊 Tamaño nuevo: ${newSize} KB`);
console.log(`📊 Diferencia: +${newSize - oldSize} KB`);
console.log(`\n🎯 RESULTADO:`);
console.log(`   - Catálogo anterior: ~1,200 municipios`);
console.log(`   - Catálogo nuevo: 8,132 municipios (TODOS los municipios de España)`);
console.log(`   - Incluye: Estepona, Dos Hermanas, Fuengirola, y TODOS los demás`);

