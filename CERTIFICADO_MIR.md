# Certificado SSL del MIR - Instrucciones

## 🔍 Problema identificado
El error `unable to verify the first certificate` indica que necesitamos el certificado SSL del Ministerio del Interior para establecer la conexión segura.

## 📋 Pasos para obtener el certificado

### 1. Contactar con el Ministerio del Interior
- **Email**: [email del soporte técnico del MIR]
- **Teléfono**: [teléfono de soporte del MIR]
- **Solicitud**: "Necesito el certificado SSL para conectarme al Servicio de Comunicación de Hospedajes"

### 2. Información que debes proporcionar
- **Usuario**: Configurado en MIR_HTTP_USER
- **Código Arrendador**: Configurado en MIR_CODIGO_ARRENDADOR
- **Aplicación**: Delfin_Check_in
- **Entorno**: Pruebas (https://hospedajes.pre-ses.mir.es/hospedajes-web/ws/v1/comunicacion)

### 3. Formato del certificado esperado
El MIR debe proporcionarte:
- **Certificado en formato .pem o .crt**
- **Cadena de certificados completa** (si aplica)
- **Instrucciones de instalación**

## 🔧 Configuración una vez obtenido el certificado

### Opción 1: Certificado en archivo
```bash
# Crear directorio para certificados
mkdir -p /path/to/certificates

# Copiar el certificado del MIR
cp mir-certificate.pem /path/to/certificates/

# Configurar variables de entorno
export MIR_CERT_PATH=/path/to/certificates/mir-certificate.pem
```

### Opción 2: Certificado en variables de entorno
```bash
# Si el MIR proporciona el certificado como texto
export MIR_CERT_CONTENT="-----BEGIN CERTIFICATE-----
[contenido del certificado]
-----END CERTIFICATE-----"
```

## 🚀 Actualización del código

Una vez tengas el certificado, actualizaremos el cliente MIR para usarlo:

```typescript
// En ministerio-client.ts
const https = require('https');
const fs = require('fs');

// Cargar certificado del MIR
const mirCert = fs.readFileSync(process.env.MIR_CERT_PATH);

const agent = new https.Agent({
  ca: mirCert, // Certificado del MIR
  rejectUnauthorized: true // Verificar certificados
});

// Usar en fetch
const res = await fetch(this.cfg.baseUrl, {
  method: 'POST',
  headers: { /* ... */ },
  body: soapXml,
  // @ts-ignore
  agent: agent
});
```

## 🧪 Pruebas después de la configuración

1. **Test de conectividad**:
   ```bash
   curl -X GET http://localhost:3000/api/ministerio/diagnostico
   ```

2. **Test de envío real**:
   ```bash
   curl -X POST http://localhost:3000/api/ministerio/test-real \
     -H "Content-Type: application/json" \
     -d '{"entorno": "pruebas"}'
   ```

## 📞 Contactos útiles

### Ministerio del Interior
- **Sede Electrónica**: https://sede.interior.gob.es/
- **Soporte técnico**: [contacto específico del MIR]
- **Documentación**: [enlace a documentación técnica]

### Información de tu registro
- **Usuario**: Configurado en MIR_HTTP_USER
- **Código Arrendador**: Configurado en MIR_CODIGO_ARRENDADOR
- **Aplicación**: Delfin_Check_in
- **Código Establecimiento**: 0000256653

## ⚠️ Notas importantes

1. **Seguridad**: Nunca compartas las credenciales por email
2. **Entorno de pruebas**: Usa siempre el entorno de pruebas antes de producción
3. **Backup**: Guarda una copia del certificado en lugar seguro
4. **Renovación**: Los certificados pueden tener fecha de expiración

## 🔄 Estado actual

- ✅ **Cliente MIR implementado**
- ✅ **Modo simulación funcionando**
- ✅ **Endpoints creados**
- ✅ **Credenciales configuradas**
- ❌ **Certificado SSL pendiente**
- ❌ **Conexión real pendiente**

Una vez obtengas el certificado, el sistema estará 100% operativo para envíos reales al MIR.
