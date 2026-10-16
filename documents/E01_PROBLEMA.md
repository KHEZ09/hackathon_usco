# E01 - Problema, usuarios y alcance

## Problema

Productores, asociaciones, transformadores y compradores de cacao necesitan
demostrar qué ocurrió con un lote, cuánto se perdió, quién registró cada cambio
y si el producto sigue siendo confiable. La información suele quedar dispersa
en hojas, mensajes y registros que no conservan una historia verificable.

## Usuarios

- Operador: recibe lotes y registra transformaciones.
- Administrador: revisa costos, alertas, bloqueos, auditoría y confianza.
- Comprador: consulta la ficha pública y el QR sin acceder a datos internos.
- Actores del clúster: productores, asociaciones, transformadores, compradores,
  transportadores, proveedores e instituciones.

## Beneficio

ORIVIA convierte cada recepción, transformación, incidencia y cambio de estado en
una cadena de eventos verificable. El clúster agrega una red de necesidades y
conexiones con una confianza explicable.

## Alcance del MVP

Recepción, trazabilidad, inventario, merma, alertas, costos/margen, bloqueo o
liberación, auditoría append-only, ficha pública/QR, persistencia PostgreSQL,
anclaje blockchain, IA analítica y red sintética de actores.

## Exclusiones

No se prometen pagos reales, hardware, sensores ni entrenamiento de modelos.
La escritura EVM requiere conectividad RPC y saldo POL; el fallback durable en
PostgreSQL conserva la evidencia cuando esa dependencia no está disponible.

## Indicadores

1. Trazabilidad íntegra: 100% de los eventos del caso demo deben verificar la
   cadena de hashes después de reiniciar el servicio.
2. Operación: recepción de CAC001 (100 kg) y transformación a 80 kg deben
   producir merma de 20%, alerta y disponibilidad de 80 kg.

## Hechos y supuestos

Hechos: la API Flask, PostgreSQL, pruebas automatizadas, cadena local y contrato
EVM están en el repositorio. Supuesto: los datos de demostración son sintéticos
y la wallet de testnet puede recibir POL antes de una escritura EVM nueva.
