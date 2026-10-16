# hackathon_usco

Repositorio del proyecto ORIVIA para la hackatón de agroindustria de la USCO.

## Documentación de trabajo

- `PLAN_HACKATON_ORIVIA.md`: plan general, prioridades y criterios de demo.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: arquitectura, infraestructura y seguridad.
- `RUTA_BACKEND_ORIVIA.md`: pasos de implementación del backend.
- `ESTRUCTURA_BACKEND_ORIVIA.md`: carpetas, responsabilidades y contrato entre módulos.

## Código

- `hackathon_usco/`: frontend Next.js.
- `backend/`: API Flask de ORIVIA.
- `infra/orivia-server/`: despliegue versionado para Lightsail `orivia`, Compose, healthcheck, variables de ejemplo y firewall UFW.

El backend se prepara para ejecutarse en la instancia Lightsail `orivia` con Debian 13. El acceso administrativo se realiza por Tailscale.
