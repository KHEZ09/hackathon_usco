# hackathon_usco

Repositorio del proyecto ORIVIA para la hackatón de agroindustria de la USCO.

## Entrega

El paquete oficial E01-E10 está en `documents/`, con la entrada principal en
`ENTREGA.md`. Las fuentes de código son `backend/`, `frontend/` e `infra/`.

La API persiste lotes en PostgreSQL, encadena eventos con hashes, expone una
proyección pública para QR y usa Polygon Amoy cuando la wallet tiene POL. Si el
RPC no está disponible, el anclaje durable local permanece auditable y la API no
inventa un certificado EVM.

## Documentación de trabajo

- `PLAN_HACKATON_ORIVIA.md`: plan general, prioridades y criterios de demo.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: arquitectura, infraestructura y seguridad.
- `RUTA_BACKEND_ORIVIA.md`: pasos de implementación del backend.
- `ESTRUCTURA_BACKEND_ORIVIA.md`: carpetas, responsabilidades y contrato entre módulos.
- `TEAM_STRUCTURE.md`: documentos obligatorios y carpetas asignadas a Sebas, Kevin, Ángel y Daniel.
- `ESTRUCTURA_FRONTEND_ORIVIA.md`: registro del diseño frontend, herramientas, componentes y límites de demostración frente al reto.
- `OPERACION_PRUEBA_FUEGO_ORIVIA.md`: especificación operativa del software, criterios de éxito RF01–RF12, guion de prueba de fuego y casos OP-01–OP-19.
- `REQUERIMIENTOS_LANDING_CLUSTER_ORIVIA.md`: matriz de requerimientos y roles del clúster cacaotero.

## Código

- `frontend/`: frontend Next.js.
- `backend/`: API Flask de ORIVIA.
- `infra/orivia-server/`: despliegue versionado para Lightsail `orivia`, Compose, healthcheck, variables de ejemplo y firewall UFW.

## Equipo

- **Sebas:** backend de plataforma, seguridad, tokens, pedidos, blockchain e IA.
- **Kevin:** usuarios, PostgreSQL, modelos, migraciones, contabilidad e integraciones.
- **Ángel y Daniel:** UX, diseño visual y frontend.

El backend se prepara para ejecutarse en la instancia Lightsail `orivia` con Debian 13. El acceso administrativo se realiza por Tailscale.
