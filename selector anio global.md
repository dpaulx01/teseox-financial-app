¡Vamos a aterrizarlo en cambios concretos y listos para codear! 🔧✨
Tu diagnóstico es perfecto. Para “reflejar” lo que necesitas del **selector global de año**, haría tres cosas en paralelo: (1) un **selector fijo en el header** con estado **único** vía `YearContext`, (2) sincronía con **URL** (deep‑link), y (3) que **Configuración** consuma ese estado global, muestre los **años cargados** y haga **subida/borrado por año**.

Abajo te dejo **pasos + snippets** (copiables) y dónde tocar. Cito archivos reales del repo para que lo veas en contexto.

---

# 1) Un único selector global (fuente de verdad)

Ya tienes un `YearContext` que: carga `/api/financial/years`, autoselecciona un año con datos y persiste en `localStorage`. Úsalo *en todas partes* (sin `useState` locales) y expón un select en el header.&#x20;

### 1.1 Componente `GlobalYearBar` (siempre visible)

```tsx
// src/components/year/GlobalYearBar.tsx
import { useYear } from '../../contexts/YearContext';

export default function GlobalYearBar() {
  const { selectedYear, setSelectedYear, availableYears, isLoading, error } = useYear();

  if (error) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase text-text-muted">Año</span>
      <select
        disabled={isLoading || !availableYears?.length}
        className="px-2 py-1 rounded border border-border bg-glass text-sm"
        value={selectedYear ?? ''}
        onChange={(e) => setSelectedYear(Number(e.target.value) || null)}
      >
        <option value="" disabled>Seleccione…</option>
        {availableYears.map(y => (
          <option key={y.year} value={y.year}>
            {y.year}
          </option>
        ))}
      </select>
    </div>
  );
}
```

**Dónde incluirlo:** en tu layout/header (por ejemplo `AppHeader` o layout principal) para que esté siempre en pantalla. `YearContext` ya trae los años de la API y recuerda la selección.&#x20;

### 1.2 Sincronizar con la URL (deep‑link `?year=YYYY`)

```tsx
// src/hooks/useYearParamSync.ts
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useYear } from '../contexts/YearContext';

export function useYearParamSync() {
  const { selectedYear, setSelectedYear } = useYear();
  const [params, setParams] = useSearchParams();

  // Lee ?year al montar
  useEffect(() => {
    const y = Number(params.get('year'));
    if (y && y !== selectedYear) setSelectedYear(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escribe ?year cuando cambie
  useEffect(() => {
    const current = params.get('year');
    if (selectedYear && String(selectedYear) !== current) {
      params.set('year', String(selectedYear));
      setParams(params, { replace: true });
    }
  }, [selectedYear, params, setParams]);
}
```

**Dónde llamar el hook:** una sola vez en el componente raíz (`App.tsx` o layout). Así, cualquier link compartido con `?year=2024` abre ya filtrado. El contexto lee/escribe en `localStorage` también, por lo que queda todo alineado.&#x20;

---

# 2) Hacer que “Configuración” consuma el año global

Ahora `DataConfiguration.tsx` maneja un `selectedYear` **local** para producción y muestra el `YearSelector` solo en esa pestaña, lo que rompe la unicidad. Hay que **usar el contexto** y, de paso, añadir las tarjetas de **años cargados** y acciones por año.&#x20;

### 2.1 Cambios mínimos en `DataConfiguration.tsx`

* **Importa** el contexto y **elimina** el `useState` local de año.
* Haz que cualquier selector interno llame a `setSelectedYear` del contexto.
* Añade un panel **“Años disponibles”** con métricas y botón **Borrar año** (granular).

```tsx
// src/pages/DataConfiguration.tsx (extracto)
import { useYear } from '../contexts/YearContext'; // + NUEVO
// ...
const DataConfiguration: React.FC = () => {
  const { selectedYear, setSelectedYear, availableYears, refreshYears } = useYear(); // + NUEVO

  // ❌ Quitar: const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // ...tu código...

  // Panel de años (añadir dentro de la pestaña "Datos Financieros")
  function YearsOverview() {
    if (!availableYears?.length) return null;
    return (
      <div className="glass-card p-4 border border-border rounded-lg mt-6">
        <h4 className="font-display text-primary mb-3">Años disponibles</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {availableYears.map(y => (
            <div key={y.year} className={`p-3 rounded-lg border ${selectedYear===y.year ? 'border-primary bg-primary/10' : 'border-border'}`}>
              <div className="flex items-center justify-between">
                <button
                  className="text-lg font-semibold hover:text-primary"
                  onClick={() => setSelectedYear(y.year)}
                >
                  {y.year}
                </button>
                <button
                  className="text-danger text-sm hover:underline"
                  onClick={async () => {
                    if (!confirm(`¿Eliminar datos del año ${y.year}? Esta acción no se puede deshacer.`)) return;
                    const token = localStorage.getItem('access_token');
                    await fetch(`http://localhost:8001/api/financial/clear?year=${y.year}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${token ?? ''}` }
                    }); // endpoint granular ya existe
                    await refreshYears();
                    if (selectedYear === y.year) setSelectedYear(null);
                  }}
                >
                  Borrar
                </button>
              </div>
              {/* Muestra stats clave si existen en YearInfo */}
              <p className="text-xs text-text-muted mt-1">
                Registros: {y.records?.toLocaleString('es-EC')} · Cuentas: {y.accounts?.toLocaleString('es-EC')} · Ingresos: {y.total_revenue?.toLocaleString('es-EC')}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ...en el render de la pestaña financial:
  // <CSVUploader ... />  // (lo actualizamos abajo)
  // <YearsOverview />
};
```

**Por qué así:** el endpoint `DELETE /api/financial/clear?year=YYYY` ya hace borrado **granular** y deja intactos otros años. Tras borrar, refrescamos `/years` y, si borraste el año seleccionado, lo des-seleccionamos.&#x20;

> Nota: en la pestaña “Producción” puedes conservar tu `YearSelector` visual si te gusta el UX, pero debe **escribir en el contexto** (usar `setSelectedYear`) para mantener una sola fuente de verdad. El archivo actual usa un estado local; conviene reemplazarlo por el del contexto.&#x20;

---

# 3) Subida de CSV **siempre visible** y **year‑first** (con confirmación)

Tu `DataUploader.tsx` actual parsea en el cliente y postea a un PHP legacy; además usa localStorage. Mejor usar el **CSVUploader** que ya habla con la **API RBAC** y soporta `year` en `FormData`. &#x20;

El backend ya acepta `POST /api/financial/csv-upload` con `csv` y `year` y **sobrescribe** los datos de ese año de forma segura dentro de una transacción.&#x20;

### 3.1 Hacer que el uploader pida año y confirme overwrite

Si tu `CSVUploader` no expone todavía un campo de año, aquí está una versión “year-aware” (puedes adaptar el que ya tienes en `src/components/upload/CSVUploader.tsx`):

```tsx
// src/components/upload/CSVUploaderYearAware.tsx
import Papa from 'papaparse';
import { useState, useCallback } from 'react';
import { Upload, FileText, Loader, AlertCircle } from 'lucide-react';
import { useYear } from '../../contexts/YearContext';

export default function CSVUploaderYearAware() {
  const { availableYears, setSelectedYear, refreshYears } = useYear();
  const [uploadYear, setUploadYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const yearExists = availableYears?.some(y => y.year === uploadYear);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) {
      setError('Formato inválido. Selecciona un archivo .csv'); return;
    }
    setFile(f);
    setError('');
  };

  const upload = useCallback(async () => {
    if (!file) { setError('Selecciona un archivo CSV primero'); return; }
    if (yearExists) {
      const ok = confirm(`Ya existen datos para ${uploadYear}. Subir reemplazará permanentemente ese año. ¿Continuar?`);
      if (!ok) return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token') || '';
      // No re-procesamos el CSV en el cliente: lo enviamos tal cual
      const text = await file.text();
      // Si necesitas normalizar delimitador, puedes re-serializar con Papa:
      const rows = Papa.parse<string[]>(text, { delimiter: ';', skipEmptyLines: true }).data as string[][];
      const blob = new Blob([Papa.unparse(rows, { delimiter: ';' })], { type: 'text/csv' });

      const formData = new FormData();
      formData.append('csv', blob, file.name);
      formData.append('year', String(uploadYear));

      const res = await fetch('http://localhost:8001/api/financial/csv-upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Error ${res.status}: ${t}`);
      }

      // Refrescar años y seleccionar el recién subido
      await refreshYears();
      setSelectedYear(uploadYear);
      alert('CSV procesado y guardado correctamente');
    } catch (e: any) {
      setError(e?.message || 'Error al subir');
    } finally {
      setIsLoading(false);
    }
  }, [file, uploadYear, yearExists, refreshYears, setSelectedYear]);

  return (
    <div className="hologram-card p-6 rounded-2xl shadow-hologram">
      <div className="flex items-center gap-3 mb-4">
        <Upload className="w-6 h-6 text-primary" />
        <h3 className="text-xl font-display text-primary">Subir CSV por Año</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block text-sm text-text-secondary mb-2">Año destino</label>
          <input
            type="number"
            className="w-full p-3 glass-card border border-border rounded"
            value={uploadYear}
            onChange={(e) => setUploadYear(Number(e.target.value))}
            min={2000} max={2100}
          />
          {yearExists && <p className="text-xs text-warning mt-1">Se reemplazará el año {uploadYear}</p>}
        </div>

        <div>
          <label htmlFor="csv" className="block text-sm text-text-secondary mb-2">Archivo CSV</label>
          <input id="csv" type="file" accept=".csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          {file && <p className="text-xs mt-1">{file.name}</p>}
        </div>

        <div>
          <button
            disabled={isLoading || !file}
            onClick={upload}
            className="w-full cyber-button flex items-center justify-center gap-2"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            <span>{isLoading ? 'Cargando…' : 'Subir y Guardar'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
}
```

**Por qué así:** el backend ya implementa **sobrescritura segura** por año (borra e inserta en transacción), y el endpoint existe tal cual. Tras subir, actualizamos el listado de años y seleccionamos el año subido.&#x20;

**Sustituye** en `DataConfiguration` el `DataUploader` legacy por este `CSVUploaderYearAware` para que **siempre** esté visible (no desaparezca tras una carga). El `DataUploader` actual postea a `financial_data_processed.php` y limpia/usa `localStorage`; conviene retirarlo para no romper la arquitectura year‑first.&#x20;

> Si prefieres no crear un archivo nuevo, puedes **modificar** tu `CSVUploader` existente (ya usa `http://localhost:8001/api/financial/csv-upload` y token) para que incluya un `<input year>` y la confirmación de overwrite como muestro arriba.&#x20;

---

# 4) Botón “Limpiar” → “Limpiar **año** seleccionado” (o por tarjeta)

En tu pestaña “Datos Financieros” hay un botón “Limpiar” general. Cámbialo por:

* “Limpiar **{selectedYear}**” si quieres acción rápida, o
* quítalo y quédate solo con los **botones por tarjeta de año** (más seguro).

La API soporta `DELETE /api/financial/clear?year=YYYY` y **NO** borra otros años.&#x20;

---

# 5) (Opcional) Cliente de API que adjunte `year` por defecto

Si tienes utilidades tipo `financialStorage.ts`, agrega una capa que inyecte `&year=${selectedYear}` automáticamente (GET/POST), evitando olvidos. Tu doc de arquitectura y flujos valida el enfoque **year-first** end‑to‑end.&#x20;

---

## Checklist de cambios

* [x] **Header**: `GlobalYearBar` con `useYear()` (visible en toda la app).&#x20;
* [x] **URL Sync**: `useYearParamSync()` en raíz.
* [x] **Configuración**:

  * [x] Reemplazar estado local de año por `useYear()`.&#x20;
  * [x] Panel “Años disponibles” con métricas y **Borrar año** (DELETE granular).&#x20;
  * [x] Uploader **persistente** con campo “Año” + confirmación si existe.&#x20;
  * [x] Retirar `DataUploader` legacy (PHP/localStorage).&#x20;

Con esto logras:

* **Un solo selector global** coherente;
* **Deep links** (`?year=2024`);
* **Gestión multi‑año completa** (ver, subir y borrar por año) desde “Configuración”, alineado con la API existente. &#x20;

Si quieres, te paso **diffs línea a línea** para `DataConfiguration.tsx` y un PR‑style patch para introducir `GlobalYearBar` + el uploader “year‑aware”.
