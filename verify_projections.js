// Verificación de proyecciones inteligentes con datos reales
console.log('🔍 VERIFICACIÓN DE PROYECCIONES INTELIGENTES');
console.log('='.repeat(50));

// Datos REALES extraídos de la base de datos
const datosReales = {
  ingresos: {
    cuenta: '4 - Ingresos',
    valores: [8341.12, 4175.78, 24761.14, 14274.80, 12399.10, 32190.48] // ene-jun 2025
  },
  costos: {
    cuenta: '5 - Costos y Gastos', 
    valores: [11272.57, 12288.58, 13172.90, 13666.61, 14253.76, 21641.57] // ene-jun 2025
  }
};

// Función del algoritmo inteligente (exacta del código)
function calcularProyeccionInteligente(valoresHistoricos, mesIndex) {
  if (valoresHistoricos.length < 2) {
    return valoresHistoricos.length === 1 ? 
      Math.round(valoresHistoricos[0] * (1 + mesIndex * 0.02)) : 0;
  }
  
  // 1. Regresión lineal para tendencia real
  const n = valoresHistoricos.length;
  const xValues = Array.from({length: n}, (_, i) => i + 1);
  const yValues = valoresHistoricos;
  
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // 2. Volatilidad específica de la cuenta
  const avgValue = sumY / n;
  const volatility = Math.sqrt(yValues.reduce((sum, val) => sum + Math.pow(val - avgValue, 2), 0) / n) / avgValue;
  
  // 3. Proyección basada en tendencia
  const nextPeriod = n + 1 + mesIndex;
  let projectedValue = slope * nextPeriod + intercept;
  
  // 4. Factor estacional inteligente
  const seasonalFactor = 1 + (Math.sin((mesIndex + 6) * Math.PI / 6) * Math.min(volatility, 0.15));
  
  // 5. Promedio móvil ponderado dinámico
  const weights = Array.from({length: n}, (_, i) => (i + 1) / ((n * (n + 1)) / 2));
  const weightedAvg = valoresHistoricos.reduce((sum, val, i) => sum + val * weights[i], 0);
  
  // 6. Combinar tendencia + promedio ponderado
  projectedValue = (projectedValue * 0.6) + (weightedAvg * 0.4);
  
  // 7. Aplicar estacionalidad
  projectedValue *= seasonalFactor;
  
  // 8. Limitar cambios extremos (máximo 25%)
  const lastValue = valoresHistoricos[valoresHistoricos.length - 1];
  const maxChange = Math.abs(lastValue) * 0.25;
  const change = projectedValue - lastValue;
  
  if (Math.abs(change) > maxChange) {
    projectedValue = lastValue + (change > 0 ? maxChange : -maxChange);
  }
  
  return Math.round(Math.max(0, projectedValue));
}

// Calcular estadísticas por cuenta
Object.entries(datosReales).forEach(([tipo, data]) => {
  console.log(`\n📊 ${data.cuenta}`);
  console.log('-'.repeat(40));
  
  const valores = data.valores;
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  const tendencia = (valores[5] - valores[0]) / valores[0] * 100;
  const volatilidad = Math.sqrt(valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) / valores.length) / promedio * 100;
  
  console.log(`Datos históricos: [${valores.map(v => '$' + v.toLocaleString()).join(', ')}]`);
  console.log(`Promedio 6 meses: $${promedio.toLocaleString()}`);
  console.log(`Tendencia total: ${tendencia.toFixed(1)}%`);
  console.log(`Volatilidad: ${volatilidad.toFixed(1)}%`);
  
  // Proyecciones julio-diciembre
  console.log('\nProyecciones inteligentes:');
  const meses = ['Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  meses.forEach((mes, index) => {
    const proyeccion = calcularProyeccionInteligente(valores, index);
    const cambioVsJunio = ((proyeccion - valores[5]) / valores[5] * 100).toFixed(1);
    console.log(`  ${mes}: $${proyeccion.toLocaleString()} (${cambioVsJunio > 0 ? '+' : ''}${cambioVsJunio}%)`);
  });
});

// Calcular utilidades proyectadas
console.log('\n💰 UTILIDADES PROYECTADAS (Ingresos - Costos):');
console.log('='.repeat(50));

const meses = ['Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
let totalUtilidad = 0;

meses.forEach((mes, index) => {
  const ingresosProyectados = calcularProyeccionInteligente(datosReales.ingresos.valores, index);
  const costosProyectados = calcularProyeccionInteligente(datosReales.costos.valores, index);
  const utilidad = ingresosProyectados - costosProyectados;
  const margen = (utilidad / ingresosProyectados * 100).toFixed(1);
  
  totalUtilidad += utilidad;
  
  console.log(`${mes.padEnd(12)} | UB: $${utilidad.toLocaleString().padStart(8)} | Margen: ${margen.padStart(5)}%`);
});

console.log(`\nUtilidad total proyectada jul-dic: $${totalUtilidad.toLocaleString()}`);
console.log(`Promedio mensual: $${(totalUtilidad/6).toLocaleString()}`);

// Comparar con datos reales históricos
const utilidadJunio = datosReales.ingresos.valores[5] - datosReales.costos.valores[5];
console.log(`\nComparación con junio 2025:`);
console.log(`Junio real: $${utilidadJunio.toLocaleString()}`);
console.log(`Julio proyectado: $${(calcularProyeccionInteligente(datosReales.ingresos.valores, 0) - calcularProyeccionInteligente(datosReales.costos.valores, 0)).toLocaleString()}`);

console.log('\n✅ ESTAS DEBERÍAN SER LAS PROYECCIONES EN BALANCE INTERNO');
console.log('   Si ves valores diferentes, el algoritmo no se está aplicando correctamente');