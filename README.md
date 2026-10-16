# hackathon_usco

Repositorio del proyecto ORIVIA para la hackatón de agroindustria de la USCO.

## Documentación de trabajo

- `PLAN_HACKATON_ORIVIA.md`: plan general, prioridades y criterios de demo.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: arquitectura, infraestructura y seguridad.
- `RUTA_BACKEND_ORIVIA.md`: pasos de implementación del backend.
- `ESTRUCTURA_BACKEND_ORIVIA.md`: carpetas, responsabilidades y contrato entre módulos.
- `TEAM_STRUCTURE.md`: documentos obligatorios y carpetas asignadas a Sebas, Kevin, Ángel y Daniel.
- `hackathon_usco/docs/ux/ESTRUCTURA_FRONTEND_ORIVIA.md`: registro del diseño frontend, herramientas, componentes y límites de demostración frente al reto.

## Código

- `hackathon_usco/`: frontend Next.js.
- `backend/`: API Flask de ORIVIA.
- `infra/orivia-server/`: despliegue versionado para Lightsail `orivia`, Compose, healthcheck, variables de ejemplo y firewall UFW.

## Equipo

- **Sebas:** backend de plataforma, seguridad, tokens, pedidos, blockchain e IA.
- **Kevin:** usuarios, PostgreSQL, modelos, migraciones, contabilidad e integraciones.
- **Ángel y Daniel:** UX, diseño visual y frontend.

El backend se prepara para ejecutarse en la instancia Lightsail `orivia` con Debian 13. El acceso administrativo se realiza por Tailscale.
