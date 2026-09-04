# Andreani export QA - portal real

Fecha de validación: 2026-09-01

Los siguientes archivos fueron probados manualmente en el portal real de Andreani y llegaron correctamente a **Resumen de tus envíos**, sin errores de importación:

- `andreani-qa-home-delivery.xlsx` - ACEPTADO
- `andreani-qa-branch.xlsx` - ACEPTADO
- `andreani-qa-mixed.xlsx` - ACEPTADO

Este resultado valida:

- exportación A domicilio;
- exportación A sucursal;
- combinación de ambas modalidades en un mismo workbook;
- estructura de la plantilla;
- interpretación de destinatario;
- peso y dimensiones;
- valor declarado;
- ubicación/destino;
- sucursal.

Alcance de esta validación:

- se verificó la importación del Excel en el portal;
- no se realizó pago;
- no se realizó despacho;
- no se generaron etiquetas para estos envíos ficticios.

Nota:

- esta validación confirma que la estructura del workbook y el mapeo son compatibles con el portal;
- no modifica el exportador ni introduce nuevos comportamientos funcionales.
