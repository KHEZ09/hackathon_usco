# Evidencia de validación final — ORIVIA

Fecha de ejecución: 2026-10-16  
Repositorio local: `hackathon_usco`  
Commit de cierre local: `e0d5cd8`  
Estado Git: limpio, `main` adelantada dos commits respecto a `origin/main`.

## Pruebas ejecutadas

| Área | Comando | Resultado observado |
|---|---|---|
| Backend | `python -m pytest -q` | `118 passed, 1 warning` |
| Backend | `python -m compileall -q app tests` | Correcto |
| Frontend tipos | `npm run type-check` | Correcto |
| Frontend calidad | `npm run lint` | Correcto |
| Frontend funcional | `npm test` | RF01, RF02, RF04, RF05, RF08, RF09, RF10, RF11, RF12 y pruebas del clúster correctas |
| Frontend producción | `npm run build` | Next.js 16.4.2 + Webpack; 9 rutas estáticas generadas |
| Integridad de cambios | `git diff --check` | Correcto |

## Paquete frontend preparado

El build se generó con:

```text
NEXT_PUBLIC_ORIVIA_API_URL=https://oriviaurlapi.tobaru.xyz/api/v1
NEXT_PUBLIC_ORIVIA_DEMO_MODE=false
```

El archivo de despliegue es `orivia-hostinger-static.zip`, fuera del repositorio, con el contenido de `frontend/out/` en la raíz. SHA-256:

```text
40828694B814650732E87F511245EF8B90DCBFCD067DB20FD0D6CEE2578016BE
```

La inspección del artefacto confirmó que no contiene referencias a `localhost:8000` y sí contiene la URL pública de la API.

## Funcionalidad comprobada en código y pruebas

- Recepción y validación de lotes.
- Transformación, saldo, merma e idempotencia.
- Alertas por merma.
- Bloqueo/liberación restringido por rol y auditado.
- QR/ficha pública y consulta de historial.
- Anclaje blockchain durable y lectura/verificación de anclajes.
- Integración de IA mediante la ruta de analítica con fallback documentado.
- Clúster: necesidades, coincidencias explicadas, conexiones y confianza.
- Lectura real de lotes persistidos mediante `GET /api/v1/lots`.

## Evidencia externa todavía no falsificada

Estos puntos no se declaran completados porque necesitan un recurso o una persona fuera del entorno local:

1. Nueva escritura EVM en Polygon Amoy: la wallet necesita POL; el faucet informó límite de uso reciente. Existe anclaje EVM previo y el fallback durable está probado.
2. Backup y restore real de PostgreSQL en el servidor: falta capturar el artefacto y la restauración verificable.
3. Prueba de carga de 100 registros con tiempo medido: falta ejecutar y conservar la medición oficial.
4. Sesión de usabilidad con participantes externos: falta ejecutar y adjuntar resultados.
5. Publicación en Hostinger: el sitio `orivia.tobaru.xyz` está creado y con SSL activo, pero la página por defecto aún no ha sido reemplazada. El ZIP está listo para carga.
6. Push final a GitHub: el commit local existe, pero la cuenta/conector devolvió error 403 y el shell no tiene credenciales de escritura.

## Criterio de cierre

El estado local es reproducible y está listo para desplegar. La entrega no debe etiquetarse como “100% verificada” hasta cerrar los seis puntos externos anteriores y repetir el smoke test contra los dominios publicados.
