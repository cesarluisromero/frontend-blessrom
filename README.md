# Blessrom — frontend

Workspace Angular 22 con dos aplicaciones standalone e independientes.

| Aplicación | Código | Desarrollo | Salida de producción |
| --- | --- | --- | --- |
| Tienda pública | projects/tienda | http://127.0.0.1:4200 | dist/tienda/browser |
| Administración interna | projects/administracion | http://127.0.0.1:4201 | dist/administracion/browser |

## Requisitos y ejecución
Node.js 24.15 o superior dentro de la rama 24; versión de referencia: 24.22.1 (.nvmrc).
El Node 20.16 instalado originalmente en este equipo no es compatible.
Instalar Node 24 antes de ejecutar los comandos siguientes en PowerShell:

    Set-Location "D:\Proyecto Blessrom\frontend-blessrom"
    npm ci
    npm run start:tienda

En otra terminal, desde el mismo directorio:

    npm run start:admin

Producción:

    npm run build

Cada aplicación genera archivos estáticos independientes. No requiere un proceso Node en el VPS.
El servidor de producción debe resolver las rutas de Angular con fallback a index.html.

## Alcance inicial
- Tienda: portada responsive, logo recuperado de la propuesta aprobada, navegación al catálogo y panel lateral del asistente.
- Catálogo: pantalla inicial y comprobación real de disponibilidad de la API; aún no presenta productos.
- Administración: vista general y comprobación real de disponibilidad de la API.
- SCSS compartido en shared/theme.scss, rutas lazy y TypeScript/templates estrictos.
- Asistente: interfaz únicamente, claramente marcado como pendiente; no simula respuestas de IA.
- Todavía no se implementaron login Keycloak, CRUD comercial, carrito, checkout, pagos, cuenta ni contacto.
- La pantalla de administración no concede permisos. Los endpoints protegidos del backend requieren autenticación.

## API
El navegador consulta /api/v1. En desarrollo proxy.conf.json reenvía a
https://api.blessrom.com con validación TLS. Solo se consulta GET /api/v1/system.
No se incluyen tokens, contraseñas ni claves privadas.

Antes de publicar el frontend, configurar /api/ en cada origen mediante Nginx hacia el backend,
o implementar una URL configurable y la política CORS correspondiente. El proxy de desarrollo
no se incluye en los builds. No se cambió el VPS ni se desplegó este frontend.

## Validación inicial
Ambas aplicaciones compilaron en producción con Angular 22 y Node 24.22.1.
Por un error EPERM de Windows al instalar node_modules en D:, se validó una copia de los
mismos fuentes en la carpeta frontend-validation del espacio de trabajo de Codex.
El lockfile proviene de esa instalación. La instalación local en este repositorio
se realiza con npm ci desde PowerShell después de actualizar Node.

## Próximas entregas
1. Integración OIDC/PKCE con Keycloak y acceso del equipo.
2. Catálogo real y fichas de productos.
3. Gestión interna de productos, precios, imágenes e inventario.
4. Carrito, envío, checkout y pedidos.
5. Pasarela de pago, asistente IA y despliegue del frontend por GitHub Actions.
## Despliegue automatizado
Consultar [GitHub Actions y VPS](docs/despliegue-github-actions.md).
