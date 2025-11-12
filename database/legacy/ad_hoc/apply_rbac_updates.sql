-- ========================================
-- APLICAR ACTUALIZACIONES RBAC
-- ========================================

USE artyco_financial_rbac;

-- Actualizar roles existentes
UPDATE roles SET name = 'CEO/Director', description = 'Acceso total al sistema, visión estratégica y toma de decisiones' WHERE id = 1;
UPDATE roles SET name = 'CFO/Gerente Financiero', description = 'Gestión financiera completa, aprobaciones y configuración' WHERE id = 2;
UPDATE roles SET name = 'Analista Senior', description = 'Análisis avanzado, creación de reportes y modificación de datos' WHERE id = 3;
UPDATE roles SET name = 'Analista Junior', description = 'Análisis básico y visualización de reportes' WHERE id = 4;

-- Insertar nuevos roles
INSERT INTO roles (id, name, description) VALUES
(5, 'Contador', 'Gestión de datos financieros y reconciliación'),
(6, 'Auditor', 'Solo lectura con acceso a logs y trazabilidad'),
(7, 'Inversionista', 'Acceso limitado a KPIs y reportes ejecutivos'),
(8, 'Consultor Externo', 'Acceso temporal a módulos específicos')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- Limpiar e insertar permisos
DELETE FROM permissions;

INSERT INTO permissions (name, resource, action, description) VALUES
-- Dashboard
('dashboard.view', 'dashboard', 'read', 'Ver dashboard principal y KPIs'),
('dashboard.export', 'dashboard', 'export', 'Exportar datos del dashboard'),
('dashboard.customize', 'dashboard', 'write', 'Personalizar widgets y métricas'),
-- PyG
('pyg.view', 'pyg', 'read', 'Ver análisis de pérdidas y ganancias'),
('pyg.create', 'pyg', 'create', 'Crear nuevos análisis PyG'),
('pyg.edit', 'pyg', 'write', 'Editar datos de PyG existentes'),
('pyg.delete', 'pyg', 'delete', 'Eliminar análisis PyG'),
('pyg.export', 'pyg', 'export', 'Exportar reportes PyG'),
('pyg.compare', 'pyg', 'analyze', 'Realizar comparaciones entre períodos'),
-- Breakeven
('breakeven.view', 'breakeven', 'read', 'Ver análisis de punto de equilibrio'),
('breakeven.calculate', 'breakeven', 'create', 'Calcular nuevos puntos de equilibrio'),
('breakeven.sensitivity', 'breakeven', 'analyze', 'Realizar análisis de sensibilidad'),
('breakeven.scenarios', 'breakeven', 'write', 'Crear y modificar escenarios'),
('breakeven.export', 'breakeven', 'export', 'Exportar análisis'),
-- Operational
('operational.view', 'operational', 'read', 'Ver métricas operacionales'),
('operational.production', 'operational', 'write', 'Modificar datos de producción'),
('operational.efficiency', 'operational', 'analyze', 'Analizar eficiencia operativa'),
('operational.costs', 'operational', 'write', 'Gestionar costos operativos'),
('operational.forecast', 'operational', 'create', 'Crear pronósticos operacionales'),
-- Config
('config.view', 'config', 'read', 'Ver configuración del sistema'),
('config.financial', 'config', 'write', 'Modificar configuración financiera'),
('config.upload', 'config', 'create', 'Cargar nuevos datos al sistema'),
('config.backup', 'config', 'export', 'Realizar respaldos de datos'),
('config.restore', 'config', 'write', 'Restaurar datos desde respaldos'),
('config.integrations', 'config', 'admin', 'Gestionar integraciones'),
-- Users
('users.view', 'users', 'read', 'Ver lista de usuarios'),
('users.create', 'users', 'create', 'Crear nuevos usuarios'),
('users.edit', 'users', 'write', 'Editar usuarios existentes'),
('users.delete', 'users', 'delete', 'Eliminar usuarios'),
('users.roles', 'users', 'admin', 'Gestionar roles y permisos'),
('users.audit', 'users', 'read', 'Ver logs de auditoría'),
-- Brain
('brain.query', 'brain', 'read', 'Realizar consultas al sistema de IA'),
('brain.insights', 'brain', 'analyze', 'Obtener insights avanzados de IA'),
('brain.train', 'brain', 'admin', 'Entrenar y configurar modelos de IA'),
('brain.automation', 'brain', 'write', 'Configurar automatizaciones con IA'),
-- Reports
('reports.view', 'reports', 'read', 'Ver reportes generados'),
('reports.create', 'reports', 'create', 'Crear nuevos reportes personalizados'),
('reports.schedule', 'reports', 'write', 'Programar reportes automáticos'),
('reports.export.pdf', 'reports', 'export', 'Exportar reportes en PDF'),
('reports.export.excel', 'reports', 'export', 'Exportar reportes en Excel'),
('reports.share', 'reports', 'share', 'Compartir reportes con externos'),
-- Audit
('audit.logs', 'audit', 'read', 'Ver logs de auditoría del sistema'),
('audit.compliance', 'audit', 'analyze', 'Verificar cumplimiento normativo'),
('audit.export', 'audit', 'export', 'Exportar registros de auditoría'),
('audit.alerts', 'audit', 'write', 'Configurar alertas de auditoría');

-- Asignar todos los permisos al CEO/Director (role_id = 1)
DELETE FROM role_permissions;
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- Actualizar usuario admin
UPDATE users SET role_id = 1 WHERE username = 'admin';

-- Mostrar resultados
SELECT 'Roles actualizados:' as info;
SELECT id, name, description FROM roles ORDER BY id;

SELECT '\nTotal permisos creados:' as info;
SELECT COUNT(*) as total FROM permissions;

SELECT '\nPermisos del admin:' as info;
SELECT COUNT(*) as total_permisos FROM role_permissions WHERE role_id = 1;