#!/usr/bin/env node
/**
 * Minimal frontend-flavored smoke test that hits the REST API over HTTP
 * using the same base URL consumed by the React app (Vite's VITE_API_BASE_URL).
 */

const API_BASE = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8001/api';

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${path} failed (${response.status}): ${body}`);
  }
  return response.json();
}

async function main() {
  console.log(`🌐 Frontend API probe using ${API_BASE}`);

  console.log('🔐 Logging in as admin...');
  const login = await fetchJson('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const token = login.access_token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log(`    user=${login.user.username} tenant=${login.user.company_id}`);

  console.log('👥 Fetching tenant users...');
  const users = await fetchJson('/users/', { headers: authHeaders });
  console.log(`    received ${users.length} users`);

  console.log('🏭 Fetching production KPIs...');
  const kpis = await fetchJson('/production/dashboard/kpis', { headers: authHeaders });
  console.log(`    cards=${kpis.cards?.length ?? 0} alerts=${kpis.risk_alerts?.length ?? 0}`);

  console.log('🧾 Fetching sales BI summary...');
  const sales = await fetchJson('/sales-bi/dashboard/summary', { headers: authHeaders });
  console.log(
    `    periods=${sales.available_periods?.length ?? 0} total_ventas=${sales.metrics?.venta_neta_total}`,
  );

  console.log('✅ Frontend API probe finished successfully.');
}

main().catch((err) => {
  console.error('❌ Frontend API probe failed:', err);
  process.exit(1);
});
