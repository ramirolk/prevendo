# Prevendo

Sistema de gestión de stock y ventas orientado a comercios con inventario (distribuidoras, ferreterías, indumentaria, kioscos mayoristas). Pensado como base para incorporar, en una etapa futura, un módulo de predicción de demanda basado en IA.

> Proyecto de portfolio personal, desarrollado como pieza central para demostrar habilidades full-stack con foco en backend desacoplado, integridad transaccional y buenas prácticas de arquitectura.

## Stack técnico

- **Backend:** Laravel (API REST)
- **Frontend:** JavaScript + Tailwind CSS (sin framework, consumiendo la API de forma desacoplada)
- **Base de datos:** MySQL
- **Autenticación:** Laravel Sanctum
- **Entorno de desarrollo:** Docker vía Laravel Sail
- **Futuro (etapa posterior):** microservicio en Python (pandas / scikit-learn) para predicción de demanda

## Alcance del MVP (Etapa 1)

- Gestión de productos y categorías
- Registro de ventas con descuento automático de stock (transaccional, con bloqueo de fila para evitar condiciones de carrera)
- Anulación/devolución de ventas con reposición de stock
- Registro de movimientos de stock (kardex / historial auditable)
- Autenticación (Sanctum) y permisos granulares entre roles `owner` / `employee`
- Reporte de stock bajo

**Fuera de alcance por ahora (a propósito):** facturación fiscal, medios de pago detallados, descuentos/promociones, multi-sucursal, gestión de proveedores.

## Requisitos previos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- En Windows: WSL2 habilitado, con una distro Linux de uso general instalada (por ejemplo Ubuntu — `wsl --install -d Ubuntu`), y la integración de Docker Desktop con esa distro activada (Settings → Resources → WSL Integration)
- Composer instalado localmente (solo necesario para el bootstrap inicial; el desarrollo día a día corre dentro de los contenedores)

## Instalación

1. Cloná el repositorio:
   ```bash
   git clone <URL-del-repo>
   cd prevendo
   ```

2. Instalá las dependencias de PHP (esto se corre una única vez con Composer local; después todo pasa por Sail):
   ```bash
   composer install
   ```

3. Copiá el archivo de entorno de ejemplo:
   ```bash
   cp .env.example .env
   ```

4. Levantá los contenedores con Sail:
   ```bash
   ./vendor/bin/sail up -d
   ```
   > **Windows:** este comando debe correrse desde una terminal WSL (por ejemplo `wsl -d Ubuntu`), no desde PowerShell o CMD directamente, ya que `sail` es un script bash.

5. Generá la key de la aplicación:
   ```bash
   ./vendor/bin/sail artisan key:generate
   ```

6. Corré las migraciones:
   ```bash
   ./vendor/bin/sail artisan migrate
   ```

7. Verificá que todo funciona:
   ```bash
   ./vendor/bin/sail artisan --version
   ```
   Y abrí [http://localhost](http://localhost) en el navegador — deberías ver la landing de Laravel.

### Alias recomendado

Para no escribir `./vendor/bin/sail` en cada comando, agregá esto a tu `~/.bashrc` o `~/.zshrc` (dentro de la distro WSL):
```bash
alias sail='./vendor/bin/sail'
```

## Troubleshooting común (Windows + Docker Desktop + WSL2)

| Síntoma | Causa probable | Solución |
|---|---|---|
| `execvpe(/bin/bash) failed: No such file or directory` | Se está corriendo `sail` desde PowerShell/CMD, o no hay una distro Linux de uso general instalada en WSL | Instalar una distro (`wsl --install -d Ubuntu`) y correr Sail desde ahí |
| `Docker or Podman is not running` | La distro WSL en uso no tiene habilitada la integración con Docker Desktop | Docker Desktop → Settings → Resources → WSL Integration → activar la distro correspondiente |
| `ports are not available: exposing port TCP 0.0.0.0:3306` | Un MySQL local (por ejemplo, servicio de Laragon) ya está usando el puerto 3306 | Detener ese servicio (`Stop-Service <nombre>` en PowerShell) o remapear `FORWARD_DB_PORT` en el `.env` |
| `wsl --list --verbose` no muestra `docker-desktop-data` | En versiones recientes de Docker Desktop no siempre aparece esta distro; no es necesariamente un problema | Confirmar con `docker run hello-world` — si funciona, Docker está OK independientemente de esta distro |

## Comandos útiles

```bash
sail up -d              # Levantar contenedores en background
sail down                # Detener contenedores
sail artisan migrate      # Correr migraciones
sail artisan migrate:fresh --seed  # Resetear DB y correr seeders
sail composer require <paquete>    # Instalar dependencia PHP
sail npm install          # Instalar dependencias de frontend (si aplica)
sail test                 # Correr tests
```

## Estado del proyecto

🚧 En desarrollo activo — Etapa 1 (MVP).

## Licencia

Este proyecto es de uso personal/portfolio. Sin licencia de distribución definida por el momento.
