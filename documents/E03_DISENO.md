# E03 - Diseño técnico y UX

## Flujo principal

`Login -> recibir lote -> transformar -> calcular merma/alerta -> revisar costo ->
bloquear o liberar -> ficha pública/QR -> verificar historial y certificado`.

## Arquitectura

Frontend Next.js consume Flask mediante HTTPS. Flask aplica JWT y permisos,
persiste en PostgreSQL, genera eventos hash-chained y expone proyecciones
privadas/públicas. El anclaje usa PostgreSQL durable y, cuando hay RPC y fondos,
Polygon Amoy EVM. Ollama/OSS se consulta únicamente desde backend.

## Decisiones

1. PostgreSQL es la fuente durable y no el navegador: permite reinicio, auditoría
   y recuperación. Alternativa descartada: localStorage como fuente de verdad.
2. La cadena local se conserva aun si falla RPC: evita que una dependencia externa
   inutilice la demo y deja explícito cuándo el certificado EVM está pendiente.

## Reglas de acceso

El operador registra lotes y transformaciones; el administrador cambia estados,
consulta auditoría y costos; el comprador solo recibe la proyección pública.
Los permisos se verifican en la capa API, no solo en la interfaz.

## Diferenciador

El clúster conecta necesidades y ofertas de actores cacaoteros y calcula una
confianza explicable a partir de evidencias, eventos verificados, consistencia e
incidencias resueltas.
