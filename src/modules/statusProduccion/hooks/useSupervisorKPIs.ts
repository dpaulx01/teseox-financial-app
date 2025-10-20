import { useMemo } from 'react';
import { ProductionItem, DailyPlan } from '../../../types/production';
import { extractQuantityInfo } from '../utils/quantityUtils';
import { isMetadataDescription } from '../utils/textUtils';

const DAY_IN_MS = 86400000;

export interface SupervisorKPI {
  cumplimiento: {
    value: number; // porcentaje
    trend: number; // delta vs período anterior (positivo = mejoría)
  };
  atrasados: {
    count: number;
    delta: number; // vs semana anterior
  };
  cargaHoy: {
    metros: number;
    unidades: number;
  };
  proximos7d: {
    count: number;
    metros: number;
    unidades: number;
  };
}

/**
 * Hook que calcula KPIs específicos para supervisores de producción
 */
export function useSupervisorKPIs(
  items: ProductionItem[],
  dailyPlans: Record<number, DailyPlan[]>
): SupervisorKPI {
  return useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const last7Days = new Date(todayTime - 7 * DAY_IN_MS);
    const last30Days = new Date(todayTime - 30 * DAY_IN_MS);
    const last60Days = new Date(todayTime - 60 * DAY_IN_MS);
    const next7Days = new Date(todayTime + 7 * DAY_IN_MS);

    let atrasadosActuales = 0;
    let atrasadosSemanaPasada = 0;

    let entregadasEnTiempoUltimos30 = 0;
    let entregadasAtrasadasUltimos30 = 0;

    let entregadasEnTiempoPeriodoAnterior = 0;
    let entregadasAtrasadasPeriodoAnterior = 0;

    let metrosHoy = 0;
    let unidadesHoy = 0;

    let countProximos7d = 0;
    let metrosProximos7d = 0;
    let unidadesProximos7d = 0;

    for (const item of items) {
      // Filtrar items de metadata
      if (isMetadataDescription(item.producto)) {
        continue;
      }

      const quantity = extractQuantityInfo(item.cantidad);

      // Analizar fecha de entrega
      const fechaEntrega = item.fechaEntrega;
      if (fechaEntrega) {
        const entregaDate = new Date(fechaEntrega);
        if (!Number.isNaN(entregaDate.getTime())) {
          entregaDate.setHours(0, 0, 0, 0);
          const entregaTime = entregaDate.getTime();

          // Atrasados actuales
          if (entregaTime < todayTime && item.estatus !== 'Entregado') {
            atrasadosActuales += 1;
          }

          // Atrasados hace una semana
          const timeAWeekAgo = todayTime - 7 * DAY_IN_MS;
          if (entregaTime < timeAWeekAgo && item.estatus !== 'Entregado') {
            atrasadosSemanaPasada += 1;
          }

          // Próximos 7 días
          if (entregaTime >= todayTime && entregaTime <= next7Days.getTime()) {
            countProximos7d += 1;
            if (quantity.amount !== null) {
              if (quantity.unit === 'metros') {
                metrosProximos7d += quantity.amount;
              } else {
                unidadesProximos7d += quantity.amount;
              }
            }
          }

          // Cumplimiento últimos 30 días
          if (item.estatus === 'Entregado') {
            const fechaIngresoDate = item.fechaIngreso ? new Date(item.fechaIngreso) : null;
            if (fechaIngresoDate && !Number.isNaN(fechaIngresoDate.getTime())) {
              fechaIngresoDate.setHours(0, 0, 0, 0);
              const ingresoTime = fechaIngresoDate.getTime();

              // Últimos 30 días
              if (entregaTime >= last30Days.getTime() && entregaTime < todayTime) {
                if (ingresoTime <= entregaTime) {
                  entregadasEnTiempoUltimos30 += 1;
                } else {
                  entregadasAtrasadasUltimos30 += 1;
                }
              }

              // Período anterior (30-60 días atrás)
              if (entregaTime >= last60Days.getTime() && entregaTime < last30Days.getTime()) {
                if (ingresoTime <= entregaTime) {
                  entregadasEnTiempoPeriodoAnterior += 1;
                } else {
                  entregadasAtrasadasPeriodoAnterior += 1;
                }
              }
            }
          }
        }
      }

      // Carga programada para hoy (desde plan diario)
      const plan = dailyPlans[item.id];
      if (plan && plan.length > 0) {
        const todayISO = today.toISOString().split('T')[0];
        const todayPlan = plan.find(p => {
          const planDate = new Date(p.fecha);
          planDate.setHours(0, 0, 0, 0);
          return planDate.toISOString().split('T')[0] === todayISO;
        });

        if (todayPlan) {
          metrosHoy += todayPlan.metros || 0;
          unidadesHoy += todayPlan.unidades || 0;
        }
      }
    }

    // Calcular cumplimiento
    const totalEntregasUltimos30 = entregadasEnTiempoUltimos30 + entregadasAtrasadasUltimos30;
    const cumplimientoActual = totalEntregasUltimos30 > 0
      ? Math.round((entregadasEnTiempoUltimos30 / totalEntregasUltimos30) * 100)
      : 0;

    const totalEntregasPeriodoAnterior = entregadasEnTiempoPeriodoAnterior + entregadasAtrasadasPeriodoAnterior;
    const cumplimientoPeriodoAnterior = totalEntregasPeriodoAnterior > 0
      ? Math.round((entregadasEnTiempoPeriodoAnterior / totalEntregasPeriodoAnterior) * 100)
      : 0;

    const trendCumplimiento = cumplimientoActual - cumplimientoPeriodoAnterior;

    // Delta de atrasados
    const deltaAtrasados = atrasadosSemanaPasada - atrasadosActuales; // positivo = mejora

    return {
      cumplimiento: {
        value: cumplimientoActual,
        trend: trendCumplimiento,
      },
      atrasados: {
        count: atrasadosActuales,
        delta: deltaAtrasados,
      },
      cargaHoy: {
        metros: metrosHoy,
        unidades: unidadesHoy,
      },
      proximos7d: {
        count: countProximos7d,
        metros: metrosProximos7d,
        unidades: unidadesProximos7d,
      },
    };
  }, [items, dailyPlans]);
}
