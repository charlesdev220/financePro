# Skill: Dockerize App

Genera Dockerfiles multi-stage y docker-compose para el stack PropTech.  
Recibís: **$ARGUMENTS** (qué dockerizar: `backend`, `frontend`, `all`).

## Dockerfile — Backend (Spring Boot)

```dockerfile
# backend/Dockerfile
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Cache de dependencias Maven
COPY pom.xml .
COPY mvnw .
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline -q

# Build
COPY src src
RUN ./mvnw package -DskipTests -q

# Runtime — imagen mínima
FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S proptech && adduser -S proptech -G proptech
USER proptech

COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Dockerfile — Frontend (Angular + Nginx)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json .
RUN npm ci --quiet

COPY . .
RUN npm run build -- --configuration production

# Nginx mínimo
FROM nginx:alpine AS runtime
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # Angular Router — fallback a index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy API al backend
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## docker-compose.yml — Stack Completo

```yaml
services:
  postgres:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_DB: proptech_db
      POSTGRES_USER: proptech_user
      POSTGRES_PASSWORD: proptech_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U proptech_user -d proptech_db"]
      interval: 10s
      timeout: 5s
      retries: 5
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/proptech_db
      SPRING_DATASOURCE_USERNAME: proptech_user
      SPRING_DATASOURCE_PASSWORD: proptech_password
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION: 86400000
      SPRING_PROFILES_ACTIVE: dev
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    ports:
      - "8080:8080"

  frontend:
    build: ./frontend
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "4200:80"

volumes:
  postgres_data:
```

## .env.template

```bash
# Copiar a .env y rellenar — nunca commitear .env
JWT_SECRET=base64-encoded-secret-min-256-bits
POSTGRES_PASSWORD=change-in-production
```

## Reglas
- Siempre multi-stage — nunca imagen de build en producción.
- `healthcheck` en todos los servicios con dependencias.
- Secrets via variables de entorno — nunca hardcodeados en Dockerfile o docker-compose.
- `.env` en `.gitignore`. Solo commitear `.env.template`.
- Añadir `--no-cache` solo cuando se necesite rebuild limpio: `docker-compose build --no-cache`.