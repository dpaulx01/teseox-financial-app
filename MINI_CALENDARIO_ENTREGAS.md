# 📅 Mini Calendario de Entregas - Guía del Usuario

**Fecha:** 19 de Octubre, 2025
**Componente:** Vista Resumida → Cards de Producto → Próximos 7 días

---

## 🎯 ¿Qué es el Mini Calendario?

El **Mini Calendario de Entregas** es una visualización compacta de 7 días que muestra de un vistazo cuándo hay entregas programadas para un producto específico en la próxima semana.

### Ubicación
Aparece en cada card de producto dentro de la **Vista Resumida**, bajo las métricas de producción.

```
┌─────────────────────────────────────────┐
│ PRODUCTO XYZ                            │
│ Progreso: ████████░░ 80%                │
│ Total: 100 m² | Producido: 80 m²        │
│                                         │
│ 📅 Próximos 7 días                      │
│ ┌─┬─┬─┬─┬─┬─┬─┐                         │
│ │D│L│M│M│J│V│S│  ← Días de la semana   │
│ └─┴🔴┴─┴🟡┴─┴─┴─┘  ← Indicadores        │
│                                         │
│ 🔴 Cliente A - 50m² (Lun) ATRASADO      │
│ 🟡 Cliente B - 30m² (Jue) PRÓXIMO       │
└─────────────────────────────────────────┘
```

---

## 🎨 Código de Colores

El mini calendario usa 4 colores para indicar el estado de las entregas:

### 🔴 Rojo (ATRASADO)
**Significado:** Entrega vencida que no se completó a tiempo
- La fecha de entrega ya pasó
- El producto aún no está entregado
- **Acción requerida:** Alta prioridad

**Ejemplo:**
```
Fecha de hoy: 19 Oct
Fecha de entrega: 13 Oct
Estado: ATRASADO (6 días de retraso)
```

### 🟡 Amarillo (PRÓXIMO)
**Significado:** Entrega urgente en los próximos 1-3 días
- La entrega está programada dentro de 72 horas
- Requiere preparación inmediata
- **Acción requerida:** Media prioridad

**Ejemplo:**
```
Fecha de hoy: 19 Oct
Fecha de entrega: 22 Oct
Estado: PRÓXIMO (3 días restantes)
```

### 🟢 Verde (EN TIEMPO)
**Significado:** Entrega planificada con tiempo suficiente
- La entrega está a más de 3 días
- Se puede producir con normalidad
- **Acción requerida:** Baja prioridad

**Ejemplo:**
```
Fecha de hoy: 19 Oct
Fecha de entrega: 28 Oct
Estado: EN TIEMPO (9 días restantes)
```

### ⚪ Blanco/Vacío (SIN ENTREGAS)
**Significado:** No hay entregas programadas para ese día
- El día está disponible
- No requiere acción

---

## 📊 Interpretación del Mini Calendario

### Ejemplo 1: Producto con múltiples entregas
```
Producto: Cerámica Piso 60x60
Entregas activas: 3

📅 Próximos 7 días:
┌─┬─┬─┬─┬─┬─┬─┐
│D│L│M│M│J│V│S│
│ │🔴│ │🟡│ │🟢│ │
└─┴─┴─┴─┴─┴─┴─┘

Interpretación:
- Lunes (🔴): 1 entrega atrasada - URGENTE
- Jueves (🟡): 1 entrega próxima - Preparar
- Sábado (🟢): 1 entrega programada - Planificar
- Dom, Mar, Mie, Vie: Sin entregas
```

### Ejemplo 2: Producto sin entregas próximas
```
Producto: Mosaico Decorativo
Entregas activas: 1 (fecha: 5 Nov)

📅 Próximos 7 días:
┌─┬─┬─┬─┬─┬─┬─┐
│D│L│M│M│J│V│S│
│ │ │ │ │ │ │ │  ← Todos vacíos
└─┴─┴─┴─┴─┴─┴─┘

Interpretación:
- No hay entregas en los próximos 7 días
- La entrega está programada para más adelante
```

### Ejemplo 3: Día con múltiples entregas
```
Producto: Galeras Multiformato
Entregas: 2 clientes el mismo día

📅 Próximos 7 días:
┌─┬─┬─┬─┬─┬─┬─┐
│D│L│M│M│J│V│S│
│ │ │🔴│ │ │ │ │
└─┴─┴2┴─┴─┴─┴─┘
      ↑ Número indica cantidad de entregas

Interpretación:
- Miércoles: 2 entregas del mismo producto
- Al menos una está atrasada (color rojo)
- Tooltip muestra: "2 entregas - 20-oct"
```

---

## 🔢 Contador de Entregas

Cuando hay múltiples entregas el mismo día, el calendario muestra un número:

```
┌─┐
│3│  ← 3 entregas programadas para este día
└─┘
```

**Prioridad de color cuando hay múltiples entregas:**
1. Si **al menos una** está atrasada → 🔴 Rojo
2. Si **al menos una** es próxima (≤3 días) → 🟡 Amarillo
3. Si **todas** están en tiempo (>3 días) → 🟢 Verde

---

## 🖱️ Interactividad

### Tooltip (al pasar el mouse)
Cada día del calendario tiene un tooltip que muestra:

**Con entregas:**
```
2 entregas - 22 oct 2025
```

**Sin entregas:**
```
22 oct 2025
```

### No clickeable
Actualmente el mini calendario es **solo visual**, no es clickeable. Para ver los detalles completos, usar el botón **"Ver Detalles"** de la card.

---

## 🛠️ Problema Resuelto: Calendario Vacío

### Síntoma
Todos los mini calendarios mostraban recuadros blancos vacíos, sin colores ni números.

### Causa
El campo `fecha` en el objeto `DeliverySummary` no estaba en formato ISO normalizado (`YYYY-MM-DD`), por lo que la comparación `d.fecha.startsWith(dateStr)` fallaba.

### Solución
**Archivo modificado:** `src/modules/statusProduccion/hooks/useProductSummaryData.ts`

**Cambio (línea 166):**
```typescript
// ❌ ANTES (incorrecto)
fecha: fechaEntrega,  // Formato variable del backend

// ✅ DESPUÉS (correcto)
fecha: isoDate,  // Formato ISO normalizado (YYYY-MM-DD)
```

**Explicación:**
- `isoDate` se calcula en línea 143: `entregaDate.toISOString().split('T')[0]`
- Esto garantiza formato consistente: `2025-10-22`
- La comparación `d.fecha.startsWith('2025-10-22')` ahora funciona correctamente

---

## 📐 Lógica de Generación del Calendario

### Algoritmo (ProductProgressCard.tsx, línea 241-285)

```typescript
function generateMiniCalendar(summary: ProductSummary) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generar 7 días empezando desde hoy
  for (let i = 0; i < 7; i++) {
    const date = new Date(today.getTime() + i * 86400000);
    const dateStr = date.toISOString().split('T')[0];  // "2025-10-22"

    // Filtrar entregas que coinciden con este día
    const deliveriesOnDay = summary.deliveries.filter(d =>
      d.fecha.startsWith(dateStr)  // ✅ Ahora funciona correctamente
    );

    // Determinar color según entregas del día
    let status = null;
    if (deliveriesOnDay.length > 0) {
      const hasOverdue = deliveriesOnDay.some(d => d.status === 'overdue');
      const hasUpcoming = deliveriesOnDay.some(d => d.status === 'upcoming');

      if (hasOverdue) status = 'overdue';        // 🔴
      else if (hasUpcoming) status = 'upcoming'; // 🟡
      else status = 'on_time';                   // 🟢
    }

    calendar.push({
      dayLabel: dayLabels[dayOfWeek],  // "L", "M", "M", etc.
      date,
      count: deliveriesOnDay.length,   // Número de entregas
      status,                          // Color a mostrar
      tooltip: `${deliveriesOnDay.length} entrega(s) - ${date.toLocaleDateString()}`
    });
  }

  return calendar;
}
```

---

## 🎓 Uso para Supervisores

### Caso de Uso 1: Identificar productos con entregas urgentes
**Objetivo:** Saber qué productos requieren atención inmediata

**Pasos:**
1. Abrir Vista Resumida
2. Escanear visualmente los mini calendarios
3. Buscar días con 🔴 (atrasados) o 🟡 (próximos)
4. Priorizar productos con colores críticos

**Ventaja:**
- No necesita abrir cada producto individualmente
- Vista de un vistazo de toda la semana

### Caso de Uso 2: Planificar producción semanal
**Objetivo:** Distribuir recursos según carga de entregas

**Pasos:**
1. Revisar mini calendarios de todos los productos
2. Identificar días con múltiples entregas (números >1)
3. Planificar turnos y recursos para días críticos
4. Ajustar producción para evitar cuellos de botella

**Ventaja:**
- Vista agregada de carga por día
- Anticipa días con alta demanda

### Caso de Uso 3: Monitoreo matutino
**Objetivo:** Revisar estado diario de producción

**Pasos:**
1. Al iniciar el día, abrir Vista Resumida
2. Revisar columna del día actual (Lunes, Martes, etc.)
3. Identificar productos con entregas hoy
4. Verificar si hay entregas atrasadas (🔴)

**Ventaja:**
- Rutina diaria rápida (menos de 1 minuto)
- Enfoque en prioridades del día

---

## 🔍 Casos Especiales

### Producto sin fecha de entrega
```
Si un producto no tiene fecha_entrega:
- No genera entregas en summary.deliveries
- Mini calendario aparece completamente vacío
- Se muestra alerta de "missing_date"
```

### Entrega fuera del rango de 7 días
```
Fecha de hoy: 19 Oct
Fecha de entrega: 5 Nov (17 días adelante)

Resultado:
- No aparece en mini calendario (solo muestra 7 días)
- Sí aparece en "Lista de entregas críticas" si es próxima
- Visible en Vista Detallada
```

### Entregas en fin de semana
```
El mini calendario muestra todos los días:
D (Domingo), L, M, M, J, V, S (Sábado)

Si hay entrega programada para domingo:
- Aparecerá en la columna "D"
- Color según urgencia (🔴🟡🟢)
```

---

## 📊 Datos Técnicos

### Formato de fecha requerido
```typescript
// ✅ CORRECTO
fecha: "2025-10-22"    // ISO 8601 (YYYY-MM-DD)

// ❌ INCORRECTO (no funcionará)
fecha: "22/10/2025"    // Formato DD/MM/YYYY
fecha: "Oct 22, 2025"  // Formato texto
fecha: Date object     // Objeto Date
```

### Tipos TypeScript
```typescript
interface DeliverySummary {
  itemId: number;
  cliente: string;
  cantidad: string;
  fecha: string;  // ✅ DEBE SER "YYYY-MM-DD"
  estatus: string | null;
  status: 'overdue' | 'upcoming' | 'on_time';
  diasRestantes: number;
  metros: number;
  unidades: number;
}
```

---

## ✅ Verificación de Funcionamiento

### Checklist para confirmar que funciona:
- [ ] Calendario muestra letras de días (D, L, M, M, J, V, S)
- [ ] Días con entregas muestran color (🔴🟡🟢)
- [ ] Días sin entregas aparecen en blanco
- [ ] Tooltip muestra información al pasar el mouse
- [ ] Múltiples entregas muestran número
- [ ] Colores corresponden a urgencia correcta

### Si sigue saliendo vacío:
1. Verificar que `fecha` en `DeliverySummary` sea string ISO
2. Revisar que `fechaEntrega` del item no sea `null`
3. Confirmar que la fecha esté dentro de próximos 7 días
4. Verificar que el producto tenga entregas activas

---

## 📝 Resumen

**El Mini Calendario de Entregas:**
- ✅ Muestra próximos 7 días desde hoy
- ✅ Usa código de colores (🔴🟡🟢) para urgencia
- ✅ Indica cantidad de entregas por día
- ✅ Tooltip con detalles al hover
- ✅ Vista compacta sin necesidad de abrir detalles
- ✅ Ayuda a supervisores a planificar la semana

**Ahora funciona correctamente gracias a:**
- Formato ISO normalizado de fechas
- Filtrado correcto de items de metadata
- Comparación string consistente

---

**El mini calendario es una herramienta visual poderosa para gestión semanal de producción.** 📅✨
