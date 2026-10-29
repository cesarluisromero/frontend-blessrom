# Blessrom — frontend

Workspace Angular 22 con dos aplicaciones: tienda pública y administración interna.

## Desarrollo
Usar Node 24 (.nvmrc) y ejecutar:
```powershell
npm ci
npm run start:tienda
# En otra terminal:
npm run start:admin
```

Tienda: http://127.0.0.1:4200. Administración: http://127.0.0.1:4201.

## Funciones
- Portada, logo integrado y panel lateral del asistente (IA pendiente).
- Catálogo público: búsqueda, categorías, paginación y detalle de producto.
- Administración: inicio de sesión Keycloak con PKCE S256 y rol de realm admin.
- Categorías, productos, variantes, precios, URL de imagen HTTPS, borradores, publicación y archivo.
- Control de versiones para evitar sobrescribir cambios concurrentes.
- Tokens en memoria y autorización exclusivamente hacia /api/v1/admin/.
- Carrito persistente, validación de stock, tarifas por distrito, checkout y reserva de inventario por pedido.
- Consulta administrativa de pedidos y cancelación del cliente mientras la reserva está pendiente.
- Pendientes: carga de archivos, pasarela de pago y asistente IA.

## Cuenta inicial
El cliente OIDC se prepara con deploy/configure-keycloak-admin.sh y el JSON adyacente.
En el VPS ejecutar:
```bash
python3 /opt/blessrom/frontend-auth/create-admin-user.py
```
Introduce la contraseña directamente en PuTTY. La cuenta será blessrom-admin.
El script no modifica una cuenta existente. Si la asignación del rol falla tras crearla,
revisar el rol admin en el realm blessrom antes de volver a intentar.

## Flujo de prueba
1. Abrir https://admin.blessrom.com e iniciar sesión.
2. En Productos, crear una categoría.
3. Crear un producto con slug único, nombre, descripción, categoría y una variante con SKU y precio en soles.
4. Guardar el borrador. Todavía no aparece en la tienda.
5. Publicar el borrador guardado.
6. Revisar https://blessrom.com/catalogo y abrir su ficha.
7. Modificar y guardar un borrador: la tienda conserva la versión publicada hasta volver a publicar.
8. Archivar un producto lo retira del catálogo público.
Para cargar stock, abre Inventario, selecciona el producto y SKU, elige Entrada, indica cantidad y motivo, confirma y registra. Las salidas no pueden consumir unidades reservadas. El historial muestra fecha en Perú, actor y variaciones de almacén y reservas. Si hay un error al guardar, recarga y revisa el historial antes de reintentar para evitar duplicar ajustes.

## Flujo de compra sin pasarela
1. En Administración → Pedidos y envíos, crea una tarifa activa con el código UBIGEO de seis dígitos.
2. Desde Inventario registra existencias para una variante publicada.
3. En la tienda abre el producto, agrega una variante al carrito y ajusta la cantidad.
4. En el checkout selecciona el distrito, calcula el total y confirma los datos de entrega.
5. El pedido queda Pendiente de pago y reserva el stock durante 30 minutos.
6. El cliente puede cancelar desde la confirmación; el stock también se libera al vencer la reserva.
7. El equipo consulta el pedido y su historial en Administración → Pedidos y envíos.

## Validación y despliegue
```powershell
npm test
npm run build
```
Las pruebas cubren autorización, aislamiento de tokens, publicación, ajustes de inventario, persistencia del carrito, encabezados privados e idempotencia del checkout.
La API utiliza /api/v1 con proxy local y Nginx en producción.
GitHub Actions compila ambas aplicaciones, ejecuta las pruebas y despliega en el VPS.
Consultar [guía de despliegue](docs/despliegue-github-actions.md).
