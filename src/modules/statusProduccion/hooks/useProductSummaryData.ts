import { useMemo } from 'react';
import { ProductionItem, DailyPlan } from '../../../types/production';
import { extractQuantityInfo } from '../utils/quantityUtils';
import { normalizeText, isMetadataDescription } from '../utils/textUtils';

const DAY_IN_MS = 86400000;

export interface DeliverySummary {
  itemId: number;
  cliente: string;
  cantidad: string;
  fecha: string;
  estatus: string | null;
  status: 'overdue' | 'upcoming' | 'on_time';
  diasRestantes: number;
  metros: number;
  unidades: number;
}

export interface AlertBadge {
  severity: 'high' | 'medium' | 'low';
  tipo: 'overdue' | 'due_soon' | 'missing_date' | 'missing_status';
  count: number;
  items: number[];
}

export interface ProductSummary {
  productName: string;
  normalizedName: string;
  totalItems: number;
  aggregatedProgress: number;
  totalQuantity: { metros: number; unidades: number };
  producedQuantity: { metros: number; unidades: number };
  deliveries: DeliverySummary[];
  alerts: AlertBadge[];
  colorClass: string;
  nextDeliveryDate: string | null;
  status: 'on_track' | 'at_risk' | 'delayed';
  itemIds: number[];
}

interface ProductSummaryDataResult {
  summaries: ProductSummary[];
  totalProducts: number;
  totalAlerts: number;
}

const productColorPalette = [
  'border-l-emerald-400/70',
  'border-l-sky-400/70',
  'border-l-amber-400/70',
  'border-l-fuchsia-400/70',
  'border-l-rose-400/70',
  'border-l-lime-400/70',
];

/**
 * Hook que agrupa items de producción por producto y calcula métricas resumidas
 */
export function useProductSummaryData(
  items: ProductionItem[],
  dailyPlans: Record<number, DailyPlan[]>
): ProductSummaryDataResult {
  return useMemo(() => {
    const productMap = new Map<string, {
      items: ProductionItem[];
      deliveries: DeliverySummary[];
      metros: number;
      unidades: number;
      producedMetros: number;
      producedUnidades: number;
      nextDeliveryDate: string | null;
      alerts: Map<string, AlertBadge>;
    }>();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Primera pasada: agrupar por producto
    for (const item of items) {
      // Filtrar items de metadata (ODC, TIEMPO DE PRODUCCION, etc.)
      if (isMetadataDescription(item.producto)) {
        continue;
      }

      const productKey = normalizeText(item.producto || 'Sin nombre');

      let entry = productMap.get(productKey);
      if (!entry) {
        entry = {
          items: [],
          deliveries: [],
          metros: 0,
          unidades: 0,
          producedMetros: 0,
          producedUnidades: 0,
          nextDeliveryDate: null,
          alerts: new Map(),
        };
        productMap.set(productKey, entry);
      }

      entry.items.push(item);

      // Extraer cantidades
      const quantity = extractQuantityInfo(item.cantidad);
      if (quantity.amount !== null) {
        if (quantity.unit === 'metros') {
          entry.metros += quantity.amount;
        } else {
          entry.unidades += quantity.amount;
        }
      }

      // Calcular producido estimado desde plan diario
      const plan = dailyPlans[item.id];
      if (plan && plan.length > 0) {
        let producedM = 0;
        let producedU = 0;

        for (const day of plan) {
          const dayDate = new Date(day.fecha);
          dayDate.setHours(0, 0, 0, 0);

          if (dayDate <= today) {
            producedM += day.metros || 0;
            producedU += day.unidades || 0;
          }
        }

        entry.producedMetros += producedM;
        entry.producedUnidades += producedU;
      }

      // Analizar entregas
      const fechaEntrega = item.fechaEntrega;
      if (fechaEntrega) {
        const entregaDate = new Date(fechaEntrega);
        if (!Number.isNaN(entregaDate.getTime())) {
          entregaDate.setHours(0, 0, 0, 0);

          // Actualizar próxima entrega
          const isoDate = entregaDate.toISOString().split('T')[0];
          if (!entry.nextDeliveryDate || isoDate < entry.nextDeliveryDate) {
            entry.nextDeliveryDate = isoDate;
          }

          // Calcular días restantes
          const diff = entregaDate.getTime() - today.getTime();
          const diasRestantes = Math.ceil(diff / DAY_IN_MS);

          // Determinar status de la entrega
          let status: 'overdue' | 'upcoming' | 'on_time';
          if (diasRestantes < 0) {
            status = 'overdue';
          } else if (diasRestantes <= 3) {
            status = 'upcoming';
          } else {
            status = 'on_time';
          }

          const delivery: DeliverySummary = {
            itemId: item.id,
            cliente: item.cliente || 'Sin cliente',
            cantidad: item.cantidad || '',
            fecha: isoDate, // Usar formato ISO normalizado (YYYY-MM-DD)
            estatus: item.estatus,
            status,
            diasRestantes,
            metros: quantity.unit === 'metros' ? (quantity.amount || 0) : 0,
            unidades: quantity.unit === 'unidades' ? (quantity.amount || 0) : 0,
          };

          entry.deliveries.push(delivery);

          // Generar alertas
          if (status === 'overdue') {
            const key = 'overdue';
            let alert = entry.alerts.get(key);
            if (!alert) {
              alert = {
                severity: 'high',
                tipo: 'overdue',
                count: 0,
                items: [],
              };
              entry.alerts.set(key, alert);
            }
            alert.count += 1;
            alert.items.push(item.id);
          } else if (status === 'upcoming') {
            const key = 'due_soon';
            let alert = entry.alerts.get(key);
            if (!alert) {
              alert = {
                severity: 'medium',
                tipo: 'due_soon',
                count: 0,
                items: [],
              };
              entry.alerts.set(key, alert);
            }
            alert.count += 1;
            alert.items.push(item.id);
          }
        }
      } else {
        // Sin fecha de entrega
        const key = 'missing_date';
        let alert = entry.alerts.get(key);
        if (!alert) {
          alert = {
            severity: 'low',
            tipo: 'missing_date',
            count: 0,
            items: [],
          };
          entry.alerts.set(key, alert);
        }
        alert.count += 1;
        alert.items.push(item.id);
      }

      // Alertas por falta de estatus
      if (!item.estatus || item.estatus.trim() === '') {
        const key = 'missing_status';
        let alert = entry.alerts.get(key);
        if (!alert) {
          alert = {
            severity: 'low',
            tipo: 'missing_status',
            count: 0,
            items: [],
          };
          entry.alerts.set(key, alert);
        }
        alert.count += 1;
        alert.items.push(item.id);
      }
    }

    // Segunda pasada: construir summaries
    const summaries: ProductSummary[] = [];
    let colorIndex = 0;
    let totalAlerts = 0;

    for (const [normalizedName, data] of productMap.entries()) {
      const productName = data.items[0]?.producto || normalizedName;

      // Ordenar entregas por fecha
      data.deliveries.sort((a, b) => a.fecha.localeCompare(b.fecha));

      // Calcular progreso agregado
      let aggregatedProgress = 0;
      const totalMetrosOrUnidades = data.metros > 0 ? data.metros : data.unidades;
      const producedMetrosOrUnidades = data.metros > 0 ? data.producedMetros : data.producedUnidades;

      if (totalMetrosOrUnidades > 0 && producedMetrosOrUnidades > 0) {
        aggregatedProgress = Math.min(100, Math.round((producedMetrosOrUnidades / totalMetrosOrUnidades) * 100));
      } else {
        // Fallback: estimar por días hábiles
        const allDates = data.items
          .map(it => it.fechaEntrega)
          .filter((d): d is string => !!d)
          .map(d => new Date(d));

        if (allDates.length > 0) {
          const earliestEntrega = new Date(Math.min(...allDates.map(d => d.getTime())));
          earliestEntrega.setHours(0, 0, 0, 0);

          const firstIngreso = data.items
            .map(it => it.fechaIngreso)
            .filter((d): d is string => !!d)
            .map(d => new Date(d));

          if (firstIngreso.length > 0) {
            const earliestIngreso = new Date(Math.min(...firstIngreso.map(d => d.getTime())));
            earliestIngreso.setHours(0, 0, 0, 0);

            const totalDays = Math.max(1, (earliestEntrega.getTime() - earliestIngreso.getTime()) / DAY_IN_MS);
            const elapsedDays = Math.max(0, (today.getTime() - earliestIngreso.getTime()) / DAY_IN_MS);

            aggregatedProgress = Math.min(100, Math.round((elapsedDays / totalDays) * 100));
          }
        }
      }

      // Determinar status general del producto
      let status: 'on_track' | 'at_risk' | 'delayed';
      if (data.alerts.has('overdue')) {
        status = 'delayed';
      } else if (data.alerts.has('due_soon')) {
        status = 'at_risk';
      } else {
        status = 'on_track';
      }

      // Contar alertas totales
      const alertsArray = Array.from(data.alerts.values());
      totalAlerts += alertsArray.reduce((sum, alert) => sum + alert.count, 0);

      summaries.push({
        productName,
        normalizedName,
        totalItems: data.items.length,
        aggregatedProgress,
        totalQuantity: {
          metros: data.metros,
          unidades: data.unidades,
        },
        producedQuantity: {
          metros: data.producedMetros,
          unidades: data.producedUnidades,
        },
        deliveries: data.deliveries,
        alerts: alertsArray,
        colorClass: productColorPalette[colorIndex % productColorPalette.length],
        nextDeliveryDate: data.nextDeliveryDate,
        status,
        itemIds: data.items.map(it => it.id),
      });

      colorIndex += 1;
    }

    // Ordenar: primero los atrasados, luego en riesgo, luego por fecha próxima
    summaries.sort((a, b) => {
      const statusWeight = { delayed: 0, at_risk: 1, on_track: 2 };
      const weightDiff = statusWeight[a.status] - statusWeight[b.status];
      if (weightDiff !== 0) return weightDiff;

      if (a.nextDeliveryDate && b.nextDeliveryDate) {
        return a.nextDeliveryDate.localeCompare(b.nextDeliveryDate);
      }
      if (a.nextDeliveryDate) return -1;
      if (b.nextDeliveryDate) return 1;

      return a.productName.localeCompare(b.productName, 'es', { sensitivity: 'base' });
    });

    return {
      summaries,
      totalProducts: summaries.length,
      totalAlerts,
    };
  }, [items, dailyPlans]);
}
