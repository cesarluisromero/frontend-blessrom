# Despliegue de Blessrom frontend

## Arquitectura
GitHub Actions compila tienda y administracion con Node 24.22.1, verifica las salidas
y envía un paquete con checksum SHA-256 por SSH. Nginx sirve archivos estáticos:
- blessrom.com y www.blessrom.com: tienda.
- admin.blessrom.com: administración.
- /api/v1/ en ambos sitios: proxy al backend 127.0.0.1:18082.
No se publican ng serve, puertos 4200/4201 ni un proceso Node en el VPS.
La administración es una pantalla inicial sin login ni gestión activa.

## 1. Respaldo de WordPress (Hostinger hPanel)
El 29/10/2026 blessrom.com respondía desde otro alojamiento Hostinger con WordPress,
no desde este VPS. Descargar un respaldo completo de archivos y base de datos.
Conservar el alojamiento y sus registros DNS anteriores para reversión.
No basta copiar el HTML público. No borrar WordPress ni cancelar el alojamiento.
Guardar los registros reales A/AAAA/CNAME de @ y www del panel DNS.
No modificar MX, TXT, SPF, DKIM ni otros subdominios.
Las IP observadas de CDN pueden variar; no usarlas como sustituto del respaldo DNS.

## 2. Preparación del VPS (una vez, root en PuTTY)
Los archivos prepare-vps.sh y frontend.conf se dejaron en /opt/blessrom/frontend-setup.
Ejecutar:

    bash /opt/blessrom/frontend-setup/prepare-vps.sh

El script respalda /etc/nginx, crea /var/www/blessrom-frontend con acceso para
blessrom-deploy, valida Nginx y recarga. Se niega a reemplazar una configuración
existente de estos dominios. No cambia DNS, certificados ni WordPress.
Mientras no exista una release, el nuevo sitio aún no estará disponible.

## 3. GitHub: repositorio frontend-blessrom
Settings > Environments > New environment: production.
Agregar estos secrets al environment (los del backend no se comparten automáticamente):

| Secret | Valor |
| --- | --- |
| VPS_HOST | 77.37.43.158 |
| VPS_PORT | 22 |
| VPS_USER | blessrom-deploy |
| VPS_SSH_KEY | Clave privada completa de blessrom_actions, no .pub |
| VPS_KNOWN_HOSTS | Línea de host SSH verificada, igual que en backend |

Settings > Secrets and variables > Actions > Variables:
crear variable de REPOSITORIO DEPLOY_ENABLED=true cuando el VPS esté preparado.
No guardarla solo en el environment: la condición del job se evalúa antes.
Usar la clave ya autorizada para este VPS. No pegar secretos en issues o logs.

## 4. Ejecutar
Actions > Frontend CI and VPS deployment > Run workflow > main.
Los push a main compilan y, con DEPLOY_ENABLED=true, despliegan.
Los pull requests solo compilan. Si deploy aparece skipped, revisar la variable.

Los builds son dist/tienda/browser y dist/administracion/browser.
Las versiones se guardan en /var/www/blessrom-frontend/releases.
current cambia de forma atómica para publicar ambas aplicaciones juntas.
Se verifica el commit y el proxy API en ambos dominios con resolución local,
incluso antes del cambio DNS. Si falla se restaura current.
Las versiones antiguas no se eliminan automáticamente; revisar el espacio periódicamente.

## 5. DNS y HTTPS
Solo después de respaldo de WordPress y deploy exitoso:
- A @ -> 77.37.43.158 (reemplazar destino del alojamiento anterior).
- A www -> 77.37.43.158 (quitar CNAME anterior de www si corresponde).
- A admin -> 77.37.43.158.
No dejar registros AAAA anteriores si no se configura IPv6 del VPS.
Si Hostinger CDN gestiona el dominio, actualizar su ruta/desactivarlo para estos
nombres según hPanel y verificar que las solicitudes llegan al VPS.
Estos cambios reemplazan el sitio público. Conservar el alojamiento anterior.

Cuando los tres nombres resuelvan al VPS, ejecutar como root:

    certbot --nginx -d blessrom.com -d www.blessrom.com -d admin.blessrom.com --redirect
    nginx -t
    systemctl status certbot.timer --no-pager
    certbot renew --dry-run

Verificar HTTPS, portada, /catalogo, administración, /api/v1/system y HTTP 401 en
/api/v1/admin/orders sin credenciales. El proxy de Nginx sustituye al proxy de desarrollo.

## Reversión
El script restaura automáticamente la release anterior si fallan las comprobaciones.
Para revertir manualmente, seleccionar una release existente y verificada, crear
un enlace temporal y usar mv -Tf para reemplazar current como blessrom-deploy.
No borrar la versión anterior durante una incidencia.
Para revertir el hosting, restaurar en hPanel los registros DNS respaldados;
la propagación puede demorar. Conservar WordPress disponible.

## Validación
Workflow: actionlint. Scripts: bash -n y shfmt. Builds: npm ci y npm run build en CI.
No dar por publicado el sitio hasta confirmar deploy, DNS y HTTPS.