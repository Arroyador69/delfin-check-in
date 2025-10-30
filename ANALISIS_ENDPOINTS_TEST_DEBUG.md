# ========================================
# ANÁLISIS DETALLADO DE ENDPOINTS TEST/DEBUG
# ========================================
# Fecha: 2025-01-28
# Objetivo: Identificar qué endpoints se pueden eliminar de forma segura

## 🔍 **ENDPOINTS DE TESTING (19 endpoints)**

### **1. ENDPOINTS MIR TESTING (8 endpoints)**

#### **✅ SEGUROS PARA ELIMINAR:**

**`/api/test-mir-endpoint-correct`**
- **Función**: Prueba diferentes URLs del MIR para encontrar la correcta
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-mir-raw`**
- **Función**: Test MIR con petición mínima para diagnosticar
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-mir-pruebas`**
- **Función**: Test conexión MIR en entorno de pruebas
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-mir-working`**
- **Función**: Test MIR con configuración que funcionó
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-mir-final`**
- **Función**: Test final del MIR
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-mir-registros`**
- **Función**: Test de registros MIR
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-simple-mir`**
- **Función**: Test simple del MIR
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-dual-sending`**
- **Función**: Test de envío dual PV+RH
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

### **2. ENDPOINTS DE AUTENTICACIÓN TESTING (3 endpoints)**

#### **✅ SEGUROS PARA ELIMINAR:**

**`/api/test-auth-simple`**
- **Función**: Test simple de autenticación
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-auth`**
- **Función**: Test de autenticación
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-login`**
- **Función**: Test de login
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

### **3. ENDPOINTS DE EMAIL TESTING (4 endpoints)**

#### **⚠️ REVISAR ANTES DE ELIMINAR:**

**`/api/test-email`**
- **Función**: Probar envío de emails en producción
- **Conectado**: ❌ NO usado en código
- **Protección**: Tiene protección con `ADMIN_TEST_TOKEN`
- **Estado**: Útil para debugging de emails
- **Recomendación**: ⚠️ MANTENER (útil para debugging)

**`/api/test-email-method`**
- **Función**: Test de método de email
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-email-simple`**
- **Función**: Test simple de email
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-smtp`**
- **Función**: Test de configuración SMTP
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

### **4. ENDPOINTS DE REGISTRO TESTING (3 endpoints)**

#### **✅ SEGUROS PARA ELIMINAR:**

**`/api/test-registro`**
- **Función**: Test endpoint de registro con datos de prueba
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-form-submission`**
- **Función**: Test de envío de formularios
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/test-update-registration`**
- **Función**: Test de actualización de registros
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

### **5. ENDPOINTS VARIOS TESTING (1 endpoint)**

#### **✅ SEGUROS PARA ELIMINAR:**

**`/api/test-deploy`**
- **Función**: Test de deployment
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

## 🔍 **ENDPOINTS DE DEBUG (8 endpoints)**

### **1. ENDPOINTS DE DEBUG GENERAL (4 endpoints)**

#### **⚠️ REVISAR ANTES DE ELIMINAR:**

**`/api/debug-auth`**
- **Función**: Debug de autenticación
- **Conectado**: ❌ NO usado en código
- **Estado**: Útil para debugging
- **Recomendación**: ⚠️ MANTENER (útil para debugging)

**`/api/debug-email`**
- **Función**: Debug de emails
- **Conectado**: ❌ NO usado en código
- **Estado**: Útil para debugging
- **Recomendación**: ⚠️ MANTENER (útil para debugging)

**`/api/debug-email-detailed`**
- **Función**: Debug detallado de emails
- **Conectado**: ❌ NO usado en código
- **Estado**: Útil para debugging
- **Recomendación**: ⚠️ MANTENER (útil para debugging)

**`/api/debug-form-data`**
- **Función**: Debug de datos de formularios
- **Conectado**: ❌ NO usado en código
- **Estado**: Útil para debugging
- **Recomendación**: ⚠️ MANTENER (útil para debugging)

### **2. ENDPOINTS DE DEBUG MIR (4 endpoints)**

#### **✅ SEGUROS PARA ELIMINAR:**

**`/api/debug-registro-data`**
- **Función**: Debug de datos de registro
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/debug-soap-completo`**
- **Función**: Debug completo de SOAP
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/debug-address`**
- **Función**: Debug de direcciones
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

**`/api/debug/database-analysis`**
- **Función**: Análisis de base de datos
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

## 🔍 **ENDPOINTS PÚBLICOS TESTING (2 endpoints)**

### **⚠️ REVISAR ANTES DE ELIMINAR:**

**`/api/public/test-produccion`**
- **Función**: Test de producción MIR
- **Conectado**: ✅ USADO en `/settings/mir/page.tsx` (línea 112)
- **Estado**: Usado en interfaz de usuario
- **Recomendación**: ⚠️ MANTENER (usado en UI)

**`/api/public/test-pruebas`**
- **Función**: Test de pruebas MIR
- **Conectado**: ❌ NO usado en código
- **Estado**: Solo para desarrollo/testing
- **Recomendación**: ✅ ELIMINAR

## 🔍 **ENDPOINTS MINISTERIO TESTING (1 endpoint)**

### **⚠️ MANTENER (USADO EN UI):**

**`/api/ministerio/test-mir-direct`**
- **Función**: Test de conectividad directa MIR
- **Conectado**: ✅ USADO en `/admin/mir-comunicaciones/page.tsx` (línea 303)
- **Estado**: Usado en dashboard de administración
- **Recomendación**: ⚠️ MANTENER (usado en UI)

## 📊 **RESUMEN DE RECOMENDACIONES**

### **✅ ELIMINAR SEGURO (15 endpoints):**
- Todos los endpoints MIR testing (8)
- Todos los endpoints de autenticación testing (3)
- Endpoints de email testing excepto `/api/test-email` (3)
- Todos los endpoints de registro testing (3)
- Endpoint de deploy testing (1)
- Endpoints de debug MIR (4)
- `/api/public/test-pruebas` (1)

### **⚠️ MANTENER (4 endpoints):**
- `/api/test-email` - Útil para debugging de emails
- `/api/debug-auth` - Útil para debugging de autenticación
- `/api/debug-email` - Útil para debugging de emails
- `/api/debug-email-detailed` - Útil para debugging de emails
- `/api/debug-form-data` - Útil para debugging de formularios

### **⚠️ MANTENER (USADOS EN UI - 2 endpoints):**
- `/api/public/test-produccion` - Usado en settings MIR
- `/api/ministerio/test-mir-direct` - Usado en dashboard admin

## 🎯 **PLAN DE ACCIÓN RECOMENDADO**

### **FASE 1: Eliminación Segura (15 endpoints)**
```bash
# Endpoints MIR testing
rm -rf src/app/api/test-mir-endpoint-correct
rm -rf src/app/api/test-mir-raw
rm -rf src/app/api/test-mir-pruebas
rm -rf src/app/api/test-mir-working
rm -rf src/app/api/test-mir-final
rm -rf src/app/api/test-mir-registros
rm -rf src/app/api/test-simple-mir
rm -rf src/app/api/test-dual-sending

# Endpoints de autenticación testing
rm -rf src/app/api/test-auth-simple
rm -rf src/app/api/test-auth
rm -rf src/app/api/test-login

# Endpoints de email testing (excepto test-email)
rm -rf src/app/api/test-email-method
rm -rf src/app/api/test-email-simple
rm -rf src/app/api/test-smtp

# Endpoints de registro testing
rm -rf src/app/api/test-registro
rm -rf src/app/api/test-form-submission
rm -rf src/app/api/test-update-registration

# Endpoint de deploy testing
rm -rf src/app/api/test-deploy

# Endpoints de debug MIR
rm -rf src/app/api/debug-registro-data
rm -rf src/app/api/debug-soap-completo
rm -rf src/app/api/debug-address
rm -rf src/app/api/debug/database-analysis

# Endpoint público testing
rm -rf src/app/api/public/test-pruebas
```

### **FASE 2: Revisión de Endpoints Mantenidos**
- Revisar si `/api/public/test-produccion` se puede reemplazar
- Revisar si `/api/ministerio/test-mir-direct` se puede reemplazar
- Decidir sobre endpoints de debug mantenidos

## 🎉 **CONCLUSIÓN**

**✅ 15 endpoints se pueden eliminar de forma segura**
**⚠️ 6 endpoints deben mantenerse (4 útiles + 2 usados en UI)**

**Total de endpoints eliminables: 15 de 21 (71%)**






