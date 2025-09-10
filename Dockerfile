# Imagen base con Node y Python
FROM python:3.11-slim

# Instalar Node.js y npm
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Crear directorio de app
WORKDIR /app

# Copiar todos los archivos
COPY . .

# Instalar dependencias Node
RUN npm install

# Instalar dependencias Python
RUN pip install -r requirements.txt

# Exponer el puerto
EXPOSE 8080

# Ejecutar app
CMD ["python3", "main.py"] 
