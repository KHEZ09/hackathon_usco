# ORIVIA — Plan general de trabajo para la hackatón

## 1. Propósito

ORIVIA es una plataforma para registrar pedidos y operaciones agroindustriales, reconstruir su trazabilidad, verificar que los datos no hayan sido alterados y convertir la información técnica en explicaciones sencillas para los usuarios.

El objetivo de la hackatón es entregar un MVP demostrable, intuitivo y verificable. La experiencia visual y la innovación son prioritarias, pero deben apoyarse en un flujo funcional completo.

## 1.1 Nueva propuesta central: clúster digital cacaotero

La propuesta diferencial de ORIVIA es construir una **red digital del ecosistema cacaotero**, no únicamente una aplicación de pedidos ni un marketplace de residuos.

La red conecta productores, asociaciones, transformadores, compradores, agroemprendedores, transportadores, proveedores de servicios e instituciones. Su propósito es que cada sector pueda:

- conocer qué actores existen y qué ofrecen;
- declarar sus necesidades productivas, comerciales, logísticas o técnicas;
- encontrar aliados compatibles;
- registrar operaciones y lotes con evidencias;
- consultar qué tan confiable es una relación o una cadena de datos;
- acceder a la información con una interfaz clara, móvil y de bajo consumo.

La frase de producto queda así:

> **ORIVIA conecta a quienes producen, transforman y comercializan cacao, creando una red accesible donde cada necesidad y cada lote pueden ser comprendidos y comprobados.**

### Cómo se diferencia

ORIVIA no califica la verdad de una persona únicamente por una puntuación subjetiva. Construye una señal de confianza explicable a partir de:

```text
Perfil y organización declarada
    + eventos de trazabilidad registrados
    + evidencias y documentos
    + confirmaciones de otros actores
    + consistencia de cantidades, fechas y estados
    + incidencias abiertas o resueltas
    -> nivel de confianza explicable
```

Blockchain sirve para demostrar que una evidencia o un evento no fue alterado después de registrarse. No demuestra por sí sola que el dato original sea verdadero; por eso ORIVIA combina registro del responsable, confirmación de contrapartes y auditoría de consistencia.

### Necesidades por sector

| Sector | Necesidades que ORIVIA debe descubrir o atender |
|---|---|
| Productor | vender, encontrar compradores, conseguir insumos, asistencia técnica, financiación y logística. |
| Asociación | consolidar oferta, validar productores, agrupar lotes, coordinar entregas y negociar. |
| Transformador/agroemprendedor | encontrar materia prima, aliados, proveedores y oportunidades de transformación. |
| Comprador/empresa | localizar oferta confiable, revisar origen, volumen, disponibilidad y condiciones. |
| Transportador/proveedor | ofrecer servicios, consultar solicitudes cercanas y demostrar entregas. |
| Administrador/facilitador | revisar la salud de la red, alertas, verificaciones, indicadores y auditoría. |

El MVP demostrará tres roles operativos ya presentes en el frontend: **operador, administrador y comprador**. Productor, asociación, transformador y proveedor se modelan desde el inicio como tipos de actor y necesidades del clúster, aunque sus paneles completos pueden quedar para la siguiente iteración.

## 2. Flujo principal de la demo

```text
Entrar a la red
    -> Explorar actores y necesidades
    -> Abrir una ficha de productor, empresa o lote
    -> Registrar una operación o solicitar una conexión
    -> Asociar origen, producto, responsable y evidencia
    -> Cambiar estado y confirmar el evento
    -> Calcular confianza, alerta, costo o riesgo
    -> Consultar resumen generado por IA
    -> Verificar el historial y su evidencia blockchain
```

La aplicación debe mostrar la información de forma comprensible para tres perfiles del MVP:

- Operador: registra pedidos, eventos y cambios operativos.
- Administrador: revisa costos, estados, alertas, red y auditoría.
- Comprador: explora actores, observa una ficha pública limitada y verificable y solicita contacto o pedido.

## 2.1 Requisitos de la landing pública

La landing es la puerta de entrada al clúster. No debe presentar ORIVIA como un dashboard técnico, sino como una red viva, accesible y confiable.

### Secciones mínimas

1. **Hero / propuesta:** “Del origen al mundo” y la idea de conectar el ecosistema cacaotero.
2. **Cómo funciona la red:** productor, asociación, transformación, comprador y trazabilidad conectados.
3. **Explorar el clúster:** buscador o tarjetas de actores, necesidades y oportunidades.
4. **Trazabilidad comprensible:** línea de tiempo de un lote con responsable, fecha, evidencia y estado.
5. **Confianza explicada:** mostrar por qué un dato, actor o lote tiene un nivel de confianza; evitar una cifra sin explicación.
6. **Impacto de la red:** conexiones, lotes trazados, oportunidades activas y operaciones verificadas, siempre con datos sintéticos en la demo.
7. **Ficha pública / QR:** entrada directa desde un código a la historia de un lote sin mostrar costos internos ni información sensible.
8. **Acceso por rol:** iniciar sesión como operador, administrador o comprador y llegar a su panel correspondiente.
9. **Cierre / CTA:** “Conoce la red”, “Ver una ficha” o “Únete al clúster”.

### Reglas de experiencia

- La primera pantalla debe explicar el valor en menos de diez segundos.
- Toda tecnología debe traducirse a un beneficio: blockchain significa “historial que puede verificarse”; IA significa “datos que se entienden y conexiones que se recomiendan”.
- La landing debe funcionar en móvil y computador, con navegación clara, contraste, teclado y movimiento reducido.
- La ficha pública nunca expone contraseñas, tokens, costos internos ni datos personales innecesarios.
- Los datos del reto son sintéticos y deben identificarse como demostración.
- La red se muestra como una conexión entre personas y organizaciones, no como un mapa decorativo sin acciones.

## 2.2 Pestañas operativas por rol

Estas pestañas definen qué debe tener cada panel. Los nombres pueden cambiar visualmente, pero el alcance funcional debe mantenerse.

### Operador — ejecución diaria

```text
Inicio / resumen
Recepción de lote
Transformación
Inventario
Incidencias
Trazabilidad y sincronización
```

- Registrar recepción, cantidades, origen, responsable y evidencia.
- Registrar transformaciones con entrada, salida, etapa e incidencia.
- Consultar inventario disponible por lote.
- Ver alertas operativas y operaciones pendientes de sincronizar.
- No puede modificar costos globales, liberar bloqueos administrativos ni gestionar usuarios.

### Administrador — control y confianza

```text
Resumen de la red
Actores y necesidades
Lotes y estados
Alertas y riesgos
Costos y reportes
Grafo de procedencia
Auditoría / evidencias
Configuración de permisos
```

- Revisar conexiones del clúster y necesidades sin respuesta.
- Consultar procedencia, eventos, hashes y confirmaciones.
- Bloquear o liberar operaciones con motivo obligatorio y auditoría.
- Consultar costos, márgenes, reportes y exportaciones.
- Revisar alertas de inconsistencias y explicaciones de IA.
- No puede borrar el historial ni permitir que la IA cambie datos críticos sin confirmación explícita.

### Comprador / visitante registrado — descubrimiento y decisión

```text
Explorar la red
Buscar actores y oferta
Necesidades y oportunidades
Fichas públicas
Verificar lote / QR
Solicitudes y contactos
```

- Encontrar productores, asociaciones, transformadores y oferta disponible.
- Filtrar por ubicación aproximada, producto, volumen, estado y necesidades.
- Consultar una ficha pública con origen, proceso, responsables y estado.
- Verificar evidencias y solicitar contacto o pedido.
- No puede consultar costos internos, datos privados ni modificar la trazabilidad.

### Extensión futura de roles del clúster

Cuando el tiempo permita ampliar el MVP, productor, asociación, transformador y proveedor tendrán paneles derivados de estas pestañas: **mi perfil**, **mis necesidades**, **mis ofertas**, **mis operaciones**, **mis conexiones** y **mi reputación verificable**. No se debe duplicar la lógica de seguridad: el backend decidirá permisos por rol y organización.

## 2.3 Ficha de actor y ficha de necesidad

Para que la red personalice necesidades, cada actor debe contar con una ficha mínima:

```text
Quién soy + qué hago + dónde opero aproximadamente
Qué ofrezco + qué necesito + capacidad o volumen
Qué puedo confirmar + qué evidencias tengo
Con quién me relaciono + estado de cada relación
```

Una necesidad debe tener categoría, descripción, volumen, fecha límite, ubicación aproximada, estado y responsable. La IA puede recomendar coincidencias, pero la conexión final requiere aceptación humana.

## 3. Repositorio oficial

El trabajo de la hackatón se realiza en:

```text
C:\Users\sebas\Documents\GitHub\hackathon_usco\
```

Estructura principal:

```text
app/                    # Frontend Next.js existente
backend/                # API Flask de ORIVIA
ESTRUCTURA_BACKEND_ORIVIA.md
ARQUITECTURA_ORIVIA_HACKATON.md
RUTA_BACKEND_ORIVIA.md
PLAN_HACKATON_ORIVIA.md
```

No se debe desarrollar este backend dentro de `app/` ni mezclarlo con el repositorio de Tobaru.

## 3.1 Equipo y responsables

| Persona | Responsabilidad principal | Ubicación de trabajo |
|---|---|---|
| Sebas | Flask/Gunicorn, seguridad, JWT, pedidos, trazabilidad, blockchain e IA | `backend/app/security/`, `auth_tokens/`, `orders/`, `tracking/`, `audit/`, `blockchain/`, `ai/` |
| Kevin | Usuarios, PostgreSQL, modelos, migraciones, catálogo, contabilidad, reportes e integraciones externas | `backend/app/users/`, `database/`, `catalog/`, `accounting/`, `reports/`, `integrations/`, `backend/migrations/` |
| Ángel | UX, flujos, wireframes, arquitectura de información y pruebas de usabilidad | `frontend/design/`, `frontend/docs/ux/` |
| Daniel | Diseño visual, sistema de componentes, responsive, accesibilidad y frontend | `frontend/components/`, `frontend/app/`, `frontend/styles/` |

Ángel y Daniel coordinan juntos la experiencia y el diseño. No deben modificar la lógica crítica del backend sin acordarlo con Sebas y Kevin.

La matriz detallada de documentos por persona e IA está en `TEAM_STRUCTURE.md`. Ese archivo es la referencia para saber qué leer antes de modificar cada zona.

## 4. Infraestructura oficial del MVP

El backend se desarrollará, probará y preparará para desplegarse en la instancia recién creada:

```text
Nombre: orivia
Servicio: Amazon Lightsail
Región: us-east-1a
Sistema: Debian 13
Acceso administrativo: Tailscale
IP privada Tailscale: 100.104.169.58
Usuario: admin
SSH: ssh admin@orivia
```

Reglas operativas:

- SSH público `22/tcp`: cerrado.
- SSH administrativo: únicamente por Tailscale.
- PostgreSQL: privado, sin exposición pública.
- API/web: publicar solo mediante proxy HTTPS cuando el despliegue esté listo.
- Usar datos sintéticos durante la hackatón.
- No modificar producción de Tobaru.
- La EC2 anterior `tacao-staging` está terminada y no se usa.
- Configurar presupuesto y alertas AWS antes de añadir servicios facturables.

La Raspberry Pi 5 queda como nodo de resiliencia y operación local para una segunda fase o una demo offline. No debe bloquear el MVP en la nube.

## 5. División del trabajo

### Sebas: plataforma y seguridad

Trabajamos en `backend/app/` sobre:

```text
security/
auth_tokens/
orders/
tracking/
audit/
blockchain/
ai/
```

Responsabilidades:

- Base Flask y factory de aplicación.
- Gunicorn, Dockerfile y ejecución del servicio.
- JWT, refresh tokens, revocación y middleware.
- Roles y permisos aplicados a cada endpoint.
- Pedidos y transiciones de estado.
- Trazabilidad y auditoría.
- Hashes encadenados y evidencia blockchain.
- Ollama/IA para resumen, analítica y auditoría asistida.
- Pruebas de seguridad y acceso no autorizado.

### Kevin: usuarios, datos e integraciones

Trabaja en:

```text
backend/app/users/
backend/app/database/
backend/app/catalog/
backend/app/accounting/
backend/app/integrations/
backend/app/reports/
backend/migrations/
```

Responsabilidades:

- Usuarios, perfiles y estados de cuenta.
- PostgreSQL, modelos y migraciones.
- Clientes, proveedores, productos y catálogos.
- Contabilidad, costos y reportes generales.
- Datos sintéticos del reto.
- Repositorios de datos.
- Conectores con APIs externas.
- Reintentos, timeouts y normalización de respuestas externas.

## 6. Login y contrato de integración

El login es compartido:

1. Kevin administra la tabla y repositorio de usuarios.
2. Sebas implementa `POST /api/v1/auth/login`.
3. Sebas verifica la contraseña y emite JWT.
4. El middleware valida tokens, estado de cuenta, rol y permisos.
5. Los refresh tokens deben ser rotativos, revocables y almacenados como hash.

Ningún módulo crea una segunda tabla de usuarios ni genera tokens por fuera del módulo de seguridad.

## 7. Orden de implementación

### Fase 1 — Base técnica

- Flask, factory y configuración por ambiente.
- `/health` y `/ready`.
- Dockerfile y Docker Compose.
- PostgreSQL local.
- Contrato inicial de API.

### Fase 2 — Usuarios y seguridad

- Tablas de usuarios y roles.
- Login y JWT.
- Refresh, logout y revocación.
- Pruebas de permisos.

### Fase 3 — Pedidos y trazabilidad

- Crear y consultar pedidos.
- Estados válidos.
- Historial de eventos.
- Auditoría de actor, fecha y cambio.

### Fase 4 — Datos, contabilidad e integraciones

- Catálogos y entidades generales.
- Costos, margen y reportes.
- Conectores externos con mocks y reintentos.

### Fase 5 — Innovación demostrable

- Hash encadenado.
- Verificación de integridad.
- Anclaje blockchain pequeño y explicable.
- Resumen y auditoría con Ollama.

### Fase 6 — Demo y despliegue

- Datos sintéticos reproducibles.
- Pruebas integrales.
- Despliegue en `orivia`.
- Revisión de firewall y HTTPS.
- Ensayo completo del flujo principal.

## 8. Criterios de evaluación interna

- El flujo principal funciona con datos nuevos.
- El usuario entiende qué pasó sin conocer blockchain.
- Un operador no puede ejecutar acciones administrativas.
- El historial revela cambios y responsables.
- La evidencia puede verificarse.
- La IA explica, pero no modifica datos críticos.
- El sistema sobrevive a un reinicio.
- La interfaz es clara en computador y móvil.
- La demo tiene una historia corta, visual y convincente.

## 9. Estado y documentación

Cada cambio debe incluir:

- módulo y responsable;
- endpoint o tabla afectada;
- variables de entorno nuevas;
- pruebas ejecutadas;
- datos sintéticos necesarios;
- riesgos o pendientes.

### Nota sobre el asistente de desarrollo

Este plan fue preparado con apoyo de Codex. Perfil solicitado por el equipo: **GPT-5.6 Luna — razonamiento muy alto**. El nombre y nivel exactos del modelo activo deben verificarse en la configuración de la sesión; no se debe presentar una versión concreta no confirmada como hecho técnico del proyecto.
