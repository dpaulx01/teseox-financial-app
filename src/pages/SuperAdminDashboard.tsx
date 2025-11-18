import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Shield,
  TrendingUp,
  Plus,
  Edit,
  Power,
  PowerOff,
  Search,
  RefreshCw,
  Activity,
  BarChart3
} from 'lucide-react';
import { financialAPI } from '../services/api';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  validateSlug,
  validateUsername,
  validateEmail,
  validatePassword,
  validateCompanyName,
  validateMaxUsers
} from '../utils/validation';

interface Company {
  id: number;
  name: string;
  slug: string;
  industry: string | null;
  is_active: boolean;
  subscription_tier: string;
  subscription_expires_at: string | null;
  max_users: number;
  created_at: string;
  stats?: {
    total_users: number;
    active_users: number;
    inactive_users: number;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  company_id: number;
  company_name: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  roles: Role[];
}

interface Role {
  id: number;
  name: string;
  description?: string | null;
  is_system_role: boolean;
}

interface Analytics {
  companies: {
    total: number;
    active: number;
    inactive: number;
    by_tier: {
      trial: number;
      professional: number;
      enterprise: number;
    };
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    superusers: number;
  };
}

const SuperAdminDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'companies' | 'users'>('overview');
  const [analytics, setAnalytics] = useState<Analytics>({
    companies: {
      total: 0,
      active: 0,
      inactive: 0,
      by_tier: {
        trial: 0,
        professional: 0,
        enterprise: 0,
      },
    },
    users: {
      total: 0,
      active: 0,
      inactive: 0,
      superusers: 0,
    },
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyForm, setCompanyForm] = useState({
    name: '',
    subscription_tier: 'trial',
    max_users: 5,
    industry: '',
    description: '',
  });
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    company_id: 0,
    is_superuser: false,
  });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [userCompanyFilter, setUserCompanyFilter] = useState<number | 0>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [companyFormErrors, setCompanyFormErrors] = useState<Record<string, string>>({});
  const [userFormErrors, setUserFormErrors] = useState<Record<string, string>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    variant: 'warning'
  });

  const getDefaultRoleSelection = (roles: Role[]): number[] => {
    const viewer = roles.find((r) => r.name === 'viewer');
    if (viewer) return [viewer.id];
    return roles.length ? [roles[0].id] : [];
  };

  const validateCompanyForm = (): boolean => {
    const errors: Record<string, string> = {};

    const nameError = validateCompanyName(companyForm.name);
    if (nameError) errors.name = nameError;

    const maxUsersError = validateMaxUsers(companyForm.max_users);
    if (maxUsersError) errors.max_users = maxUsersError;

    setCompanyFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateUserForm = (): boolean => {
    const errors: Record<string, string> = {};

    const usernameError = validateUsername(userForm.username);
    if (usernameError) errors.username = usernameError;

    const emailError = validateEmail(userForm.email);
    if (emailError) errors.email = emailError;

    const passwordError = validatePassword(userForm.password, !editingUserId);
    if (passwordError) errors.password = passwordError;

    if (!userForm.company_id) {
      errors.company_id = 'Selecciona una compañía';
    }

    if (!selectedRoleIds.length) {
      errors.roles = 'Selecciona al menos un rol';
    }

    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (activeView === 'companies') {
      loadCompanies();
    } else if (activeView === 'users') {
      // En la vista de usuarios necesitamos las compañías para el selector
      loadCompanies();
      loadUsers();
      loadRoles();
    }
  }, [activeView]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const response = await financialAPI.get<Analytics>('/api/superadmin/analytics/overview');
      // Axios returns the payload in .data; guard against unexpected shapes
      const payload = (response as any)?.data ?? response;
      setAnalytics(payload as Analytics);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const roles = await financialAPI.saListRoles();
      setAvailableRoles(roles as Role[]);
      setSelectedRoleIds((prev) => (prev.length ? prev : getDefaultRoleSelection(roles as Role[])));
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const payload = await financialAPI.saListCompanies({ limit: 100 });
      setCompanies(payload as Company[]);
      // Preselect company for user form if empty
      if (!userForm.company_id && payload.length > 0) {
        setUserForm((prev) => ({ ...prev, company_id: payload[0].id }));
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 200 };
      if (userCompanyFilter) params.company_id = userCompanyFilter;
      const payload = await financialAPI.saListUsers(params);
      setUsers(payload as User[]);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!validateCompanyForm()) {
      setFeedback('⚠️ Corrige los errores en el formulario');
      return;
    }

    try {
      setLoading(true);
      if (editingCompanyId) {
        await financialAPI.saUpdateCompany(editingCompanyId, {
          name: companyForm.name.trim() || undefined,
          subscription_tier: companyForm.subscription_tier,
          max_users: companyForm.max_users || undefined,
          industry: companyForm.industry || undefined,
          description: companyForm.description || undefined,
        });
        setFeedback('✅ Compañía actualizada');
      } else {
        await financialAPI.saCreateCompany({
          name: companyForm.name.trim(),
          subscription_tier: companyForm.subscription_tier,
          max_users: companyForm.max_users || undefined,
          industry: companyForm.industry || undefined,
          description: companyForm.description || undefined,
        });
        setFeedback('✅ Compañía creada');
      }
      setCompanyForm({
        name: '',
        subscription_tier: 'trial',
        max_users: 5,
        industry: '',
        description: '',
      });
      setCompanyFormErrors({});
      setEditingCompanyId(null);
      await loadCompanies();
      await loadAnalytics();
    } catch (error: any) {
      console.error('Error creating company:', error);
      setFeedback(error?.response?.data?.detail || 'Error al guardar compañía');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompanyId(company.id);
    setCompanyForm({
      name: company.name,
      subscription_tier: company.subscription_tier,
      max_users: company.max_users,
      industry: company.industry || '',
      description: '',
    });
    setFeedback(`Editando compañía: ${company.name}`);
  };

  const handleCancelEditCompany = () => {
    setEditingCompanyId(null);
    setCompanyForm({
      name: '',
      subscription_tier: 'trial',
      max_users: 5,
      industry: '',
      description: '',
    });
    setCompanyFormErrors({});
  };

  const handleSaveUser = async () => {
    if (!validateUserForm()) {
      setFeedback('⚠️ Corrige los errores en el formulario');
      return;
    }

    try {
      setLoading(true);
      const companyChanged = editingUserId ? userForm.company_id !== (users.find(u => u.id === editingUserId)?.company_id ?? userForm.company_id) : false;
      if (editingUserId) {
        await financialAPI.saUpdateUser(editingUserId, {
          username: userForm.username.trim() || undefined,
          email: userForm.email.trim() || undefined,
          password: userForm.password || undefined,
          first_name: userForm.first_name || undefined,
          last_name: userForm.last_name || undefined,
          is_superuser: userForm.is_superuser,
          is_active: undefined,
        });
        await financialAPI.saAssignRoles(editingUserId, selectedRoleIds);
        if (companyChanged) {
          await financialAPI.saChangeUserCompany(editingUserId, userForm.company_id);
        }
        setFeedback('✅ Usuario actualizado');
      } else {
        const created = await financialAPI.saCreateUser({
          username: userForm.username.trim(),
          email: userForm.email.trim(),
          password: userForm.password,
          first_name: userForm.first_name || undefined,
          last_name: userForm.last_name || undefined,
          company_id: userForm.company_id,
          is_superuser: userForm.is_superuser,
        });
        const newId = (created as any)?.id;
        if (typeof newId === 'number') {
          await financialAPI.saAssignRoles(newId, selectedRoleIds);
        }
        setFeedback('✅ Usuario creado');
      }
      setUserForm({
        username: '',
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        company_id: companies[0]?.id || 0,
        is_superuser: false,
      });
      setUserFormErrors({});
      setSelectedRoleIds(getDefaultRoleSelection(availableRoles));
      setEditingUserId(null);
      await loadUsers();
      await loadAnalytics();
    } catch (error: any) {
      console.error('Error creating user:', error);
      setFeedback(error?.response?.data?.detail || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserForm({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      company_id: user.company_id,
      is_superuser: user.is_superuser,
    });
    setSelectedRoleIds(user.roles?.map((r) => r.id) || getDefaultRoleSelection(availableRoles));
    setFeedback(`Editando usuario: ${user.username}`);
  };

  const handleToggleUserActive = async (user: User) => {
    const action = user.is_active ? 'desactivar' : 'activar';
    const actionPast = user.is_active ? 'desactivado' : 'activado';

    setConfirmDialog({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Usuario`,
      message: `¿Estás seguro que deseas ${action} al usuario "${user.username}"? ${
        user.is_active ? 'El usuario no podrá acceder al sistema.' : 'El usuario podrá acceder nuevamente.'
      }`,
      variant: user.is_active ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          setLoading(true);
          await financialAPI.saUpdateUser(user.id, { is_active: !user.is_active });
          await loadUsers();
          setFeedback(`✅ Usuario ${user.username} ${actionPast}`);
        } catch (error: any) {
          console.error('Error toggling user:', error);
          setFeedback(error?.response?.data?.detail || 'Error al actualizar usuario');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setUserForm({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      company_id: companies[0]?.id || 0,
      is_superuser: false,
    });
    setSelectedRoleIds(getDefaultRoleSelection(availableRoles));
    setUserFormErrors({});
  };

  const toggleCompanyStatus = async (companyId: number, currentStatus: boolean) => {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;

    const action = currentStatus ? 'desactivar' : 'activar';
    const actionPast = currentStatus ? 'desactivada' : 'activada';

    setConfirmDialog({
      isOpen: true,
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Empresa`,
      message: `¿Estás seguro que deseas ${action} la empresa "${company.name}"? ${
        currentStatus
          ? 'Todos los usuarios de esta empresa perderán acceso al sistema.'
          : 'Los usuarios de esta empresa podrán acceder nuevamente.'
      }`,
      variant: currentStatus ? 'danger' : 'info',
      onConfirm: async () => {
        try {
          setLoading(true);
          const endpoint = currentStatus
            ? `/api/superadmin/companies/${companyId}/deactivate`
            : `/api/superadmin/companies/${companyId}/activate`;
          await financialAPI.post(endpoint, {});
          await loadCompanies();
          await loadAnalytics();
          setFeedback(`✅ Empresa ${company.name} ${actionPast}`);
        } catch (error: any) {
          console.error('Error toggling company status:', error);
          setFeedback(error?.response?.data?.detail || 'Error al actualizar empresa');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="glass-card p-6 border border-border rounded-lg shadow-hologram animate-materialize">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 animate-hologram rounded-lg pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-primary neon-text animate-pulse-glow" />
              <h1 className="text-3xl font-display text-primary neon-text">
                SUPER ADMIN // CONTROL PANEL
              </h1>
            </div>
            <button
              onClick={loadAnalytics}
              className="p-2 glass-card border border-border rounded-lg hover:shadow-glow-md transition-all duration-300"
            >
              <RefreshCw className={`h-5 w-5 text-accent ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-text-muted font-mono text-sm">
            // Cross-Tenant Management System
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-2">
        {[
          { id: 'overview', label: 'Overview', icon: Activity },
          { id: 'companies', label: 'Companies', icon: Building2 },
          { id: 'users', label: 'Users', icon: Users }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveView(id as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-300 font-mono
              ${activeView === id
                ? 'bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary shadow-glow-md animate-pulse-glow'
                : 'glass-card border border-border text-text-secondary hover:bg-glass hover:text-primary hover:shadow-glow-sm'
              }`}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
          {/* Companies Stats */}
          <div className="glass-card p-6 border border-border rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all duration-300 animate-materialize">
            <div className="flex items-center justify-between mb-4">
              <Building2 className="h-8 w-8 text-primary neon-text" />
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <h3 className="text-4xl font-display text-primary neon-text mb-2">
              {analytics.companies.total}
            </h3>
            <p className="text-text-muted font-mono text-sm mb-4">Total Companies</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-text-dim">Active:</span>
                <span className="text-accent">{analytics.companies.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Inactive:</span>
                <span className="text-danger">{analytics.companies.inactive}</span>
              </div>
            </div>
          </div>

          {/* Users Stats */}
          <div className="glass-card p-6 border border-border rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all duration-300 animate-materialize" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center justify-between mb-4">
              <Users className="h-8 w-8 text-accent neon-text" />
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-4xl font-display text-accent neon-text mb-2">
              {analytics.users.total}
            </h3>
            <p className="text-text-muted font-mono text-sm mb-4">Total Users</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-text-dim">Active:</span>
                <span className="text-accent">{analytics.users.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-dim">Superusers:</span>
                <span className="text-primary">{analytics.users.superusers}</span>
              </div>
            </div>
          </div>

          {/* Subscription Tiers */}
          <div className="glass-card p-6 border border-border rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all duration-300 animate-materialize" style={{animationDelay: '0.2s'}}>
            <div className="flex items-center justify-between mb-4">
              <Shield className="h-8 w-8 text-warning neon-text" />
            </div>
            <h3 className="text-lg font-display text-text-primary mb-4">Subscription Tiers</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-mono text-sm">Trial</span>
                <span className="px-3 py-1 bg-warning/20 text-warning border border-warning rounded-full text-xs font-mono">
                  {analytics.companies.by_tier.trial}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-mono text-sm">Professional</span>
                <span className="px-3 py-1 bg-primary/20 text-primary border border-primary rounded-full text-xs font-mono">
                  {analytics.companies.by_tier.professional}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-mono text-sm">Enterprise</span>
                <span className="px-3 py-1 bg-accent/20 text-accent border border-accent rounded-full text-xs font-mono">
                  {analytics.companies.by_tier.enterprise}
                </span>
              </div>
            </div>
          </div>

          {/* System Health */}
          <div className="glass-card p-6 border border-border rounded-lg shadow-glow-sm hover:shadow-glow-md transition-all duration-300 animate-materialize" style={{animationDelay: '0.3s'}}>
            <div className="flex items-center justify-between mb-4">
              <Activity className="h-8 w-8 text-accent neon-text animate-pulse-glow" />
            </div>
            <h3 className="text-lg font-display text-text-primary mb-4">System Health</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-mono text-sm">API Status</span>
                <span className="px-3 py-1 bg-accent/20 text-accent border border-accent rounded-full text-xs font-mono animate-pulse-glow">
                  ONLINE
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-mono text-sm">Database</span>
                <span className="px-3 py-1 bg-accent/20 text-accent border border-accent rounded-full text-xs font-mono">
                  HEALTHY
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-muted font-mono text-sm">Auth System</span>
                <span className="px-3 py-1 bg-accent/20 text-accent border border-accent rounded-full text-xs font-mono">
                  SECURE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

  {/* Companies View */}
  {activeView === 'companies' && (
    <div className="space-y-4 animate-fade-in">
      {/* Quick create company */}
      <div className="glass-card border border-border rounded-lg p-4 shadow-hologram">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-display text-primary">
              {editingCompanyId ? `Editar compañía #${editingCompanyId}` : 'Crear compañía'}
            </h3>
          </div>
          <button
            onClick={handleSaveCompany}
            className="px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary text-primary rounded-lg hover:shadow-glow-sm transition-all duration-300 font-mono"
          >
            Guardar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <input
              className={`glass-card border rounded-lg px-3 py-2 text-sm font-mono w-full ${
                companyFormErrors.name ? 'border-red-500' : 'border-border'
              }`}
              placeholder="Nombre *"
              value={companyForm.name}
              onChange={(e) => {
                setCompanyForm({ ...companyForm, name: e.target.value });
                if (companyFormErrors.name) {
                  const error = validateCompanyName(e.target.value);
                  setCompanyFormErrors({ ...companyFormErrors, name: error || '' });
                }
              }}
              onBlur={() => {
                const error = validateCompanyName(companyForm.name);
                setCompanyFormErrors({ ...companyFormErrors, name: error || '' });
              }}
            />
            {companyFormErrors.name && (
              <p className="text-red-500 text-xs mt-1 font-mono">{companyFormErrors.name}</p>
            )}
          </div>
          <select
            className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono"
            value={companyForm.subscription_tier}
            onChange={(e) => setCompanyForm({ ...companyForm, subscription_tier: e.target.value })}
          >
            <option value="trial">trial</option>
            <option value="professional">professional</option>
            <option value="enterprise">enterprise</option>
          </select>
          <div>
            <input
              className={`glass-card border rounded-lg px-3 py-2 text-sm font-mono w-full ${
                companyFormErrors.max_users ? 'border-red-500' : 'border-border'
              }`}
              type="number"
              min={1}
              placeholder="Max users *"
              value={companyForm.max_users}
              onChange={(e) => {
                const value = Number(e.target.value);
                setCompanyForm({ ...companyForm, max_users: value });
                if (companyFormErrors.max_users) {
                  const error = validateMaxUsers(value);
                  setCompanyFormErrors({ ...companyFormErrors, max_users: error || '' });
                }
              }}
              onBlur={() => {
                const error = validateMaxUsers(companyForm.max_users);
                setCompanyFormErrors({ ...companyFormErrors, max_users: error || '' });
              }}
            />
            {companyFormErrors.max_users && (
              <p className="text-red-500 text-xs mt-1 font-mono">{companyFormErrors.max_users}</p>
            )}
          </div>
          <input
            className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Industria"
            value={companyForm.industry}
            onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
          />
          <input
            className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Descripción"
            value={companyForm.description}
            onChange={(e) => setCompanyForm({ ...companyForm, description: e.target.value })}
          />
        </div>
        {editingCompanyId && (
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEditCompany}
              className="px-3 py-2 border border-border rounded-lg text-text-muted hover:text-primary transition-colors font-mono"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-card border border-border rounded-lg text-text-primary placeholder-text-dim focus:border-primary focus:shadow-glow-md transition-all duration-300 font-mono"
          />
        </div>
      </div>

          {/* Companies Table */}
          <div className="glass-card border border-border rounded-lg overflow-hidden shadow-hologram">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Industry</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Tier</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Users</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-mono text-primary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-glass transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-mono text-text-primary">{company.name}</div>
                          <div className="text-xs text-text-dim font-mono">/{company.slug}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted font-mono">
                        {company.industry || '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                          company.subscription_tier === 'trial'
                            ? 'bg-warning/20 text-warning border-warning'
                            : company.subscription_tier === 'professional'
                            ? 'bg-primary/20 text-primary border-primary'
                            : 'bg-accent/20 text-accent border-accent'
                        }`}>
                          {company.subscription_tier.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono">
                          <span className="text-accent">{company.stats?.active_users || 0}</span>
                          <span className="text-text-dim"> / {company.max_users}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                          company.is_active
                            ? 'bg-accent/20 text-accent border-accent animate-pulse-glow'
                            : 'bg-danger/20 text-danger border-danger'
                        }`}>
                          {company.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="p-2 glass-card border border-border rounded hover:border-primary hover:shadow-glow-sm transition-all duration-300"
                        >
                          <Edit className="h-4 w-4 text-primary" />
                        </button>
                        <button
                          onClick={() => toggleCompanyStatus(company.id, company.is_active)}
                          className="p-2 glass-card border border-border rounded hover:border-accent hover:shadow-glow-sm transition-all duration-300"
                        >
                          {company.is_active ? (
                            <PowerOff className="h-4 w-4 text-danger" />
                          ) : (
                            <Power className="h-4 w-4 text-accent" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

  {/* Users View */}
  {activeView === 'users' && (
    <div className="space-y-4 animate-fade-in">
      {/* Quick create user */}
      <div className="glass-card border border-border rounded-lg p-4 shadow-hologram space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-display text-primary">
              {editingUserId ? `Editar usuario #${editingUserId}` : 'Crear usuario'}
            </h3>
          </div>
          <button
            onClick={handleSaveUser}
            className="px-4 py-2 bg-gradient-to-r from-primary/20 to-accent/20 border border-primary text-primary rounded-lg hover:shadow-glow-sm transition-all duration-300 font-mono"
          >
            Guardar
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <input
              className={`glass-card border rounded-lg px-3 py-2 text-sm font-mono w-full ${
                userFormErrors.username ? 'border-red-500' : 'border-border'
              }`}
              placeholder="Username *"
              value={userForm.username}
              onChange={(e) => {
                setUserForm({ ...userForm, username: e.target.value });
                if (userFormErrors.username) {
                  const error = validateUsername(e.target.value);
                  setUserFormErrors({ ...userFormErrors, username: error || '' });
                }
              }}
              onBlur={() => {
                const error = validateUsername(userForm.username);
                setUserFormErrors({ ...userFormErrors, username: error || '' });
              }}
            />
            {userFormErrors.username && (
              <p className="text-red-500 text-xs mt-1 font-mono">{userFormErrors.username}</p>
            )}
          </div>
          <div>
            <input
              className={`glass-card border rounded-lg px-3 py-2 text-sm font-mono w-full ${
                userFormErrors.email ? 'border-red-500' : 'border-border'
              }`}
              placeholder="Email *"
              type="email"
              value={userForm.email}
              onChange={(e) => {
                setUserForm({ ...userForm, email: e.target.value });
                if (userFormErrors.email) {
                  const error = validateEmail(e.target.value);
                  setUserFormErrors({ ...userFormErrors, email: error || '' });
                }
              }}
              onBlur={() => {
                const error = validateEmail(userForm.email);
                setUserFormErrors({ ...userFormErrors, email: error || '' });
              }}
            />
            {userFormErrors.email && (
              <p className="text-red-500 text-xs mt-1 font-mono">{userFormErrors.email}</p>
            )}
          </div>
          <div>
            <input
              className={`glass-card border rounded-lg px-3 py-2 text-sm font-mono w-full ${
                userFormErrors.password ? 'border-red-500' : 'border-border'
              }`}
              type="password"
              placeholder={editingUserId ? 'Nuevo password (opcional)' : 'Password *'}
              value={userForm.password}
              onChange={(e) => {
                setUserForm({ ...userForm, password: e.target.value });
                if (userFormErrors.password) {
                  const error = validatePassword(e.target.value, !editingUserId);
                  setUserFormErrors({ ...userFormErrors, password: error || '' });
                }
              }}
              onBlur={() => {
                const error = validatePassword(userForm.password, !editingUserId);
                setUserFormErrors({ ...userFormErrors, password: error || '' });
              }}
            />
            {userFormErrors.password && (
              <p className="text-red-500 text-xs mt-1 font-mono">{userFormErrors.password}</p>
            )}
          </div>
          <input
            className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Nombre"
            value={userForm.first_name}
            onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
          />
          <input
            className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Apellido"
            value={userForm.last_name}
            onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
          />
          <select
            className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono"
            value={userForm.company_id}
            onChange={(e) => setUserForm({ ...userForm, company_id: Number(e.target.value) })}
          >
            <option value={0}>Seleccione empresa</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="glass-card border border-border rounded-lg px-3 py-2 text-sm font-mono md:col-span-2">
            <div className="text-xs text-text-muted mb-2">Roles</div>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={selectedRoleIds.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRoleIds((prev) => Array.from(new Set([...prev, role.id])));
                      } else {
                        setSelectedRoleIds((prev) => prev.filter((id) => id !== role.id));
                      }
                    }}
                  />
                  {role.name}
                </label>
              ))}
              {!availableRoles.length && (
                <span className="text-text-muted text-xs">No hay roles disponibles.</span>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-mono col-span-1 md:col-span-2">
            <input
              type="checkbox"
              checked={userForm.is_superuser}
              onChange={(e) => setUserForm({ ...userForm, is_superuser: e.target.checked })}
            />
            Superusuario
          </label>
        </div>
        {editingUserId && (
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={handleCancelEditUser}
              className="px-3 py-2 border border-border rounded-lg text-text-muted hover:text-primary transition-colors font-mono"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-muted" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 glass-card border border-border rounded-lg text-text-primary placeholder-text-dim focus:border-primary focus:shadow-glow-md transition-all duration-300 font-mono"
          />
        </div>
        <select
          className="glass-card border border-border rounded-lg px-3 py-3 text-sm font-mono"
          value={userCompanyFilter}
          onChange={(e) => {
            const val = Number(e.target.value);
            setUserCompanyFilter(val);
            setTimeout(loadUsers, 0);
          }}
        >
          <option value={0}>Todas las empresas</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

          {/* Users Table */}
          <div className="glass-card border border-border rounded-lg overflow-hidden shadow-hologram">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gradient-to-r from-primary/10 to-accent/10">
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Company</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Roles</th>
                    <th className="px-6 py-4 text-left text-xs font-mono text-primary uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-mono text-primary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-glass transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-mono text-text-primary">{user.username}</div>
                          {(user.first_name || user.last_name) && (
                            <div className="text-xs text-text-dim font-mono">
                              {user.first_name} {user.last_name}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted font-mono">
                        {user.company_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-muted font-mono">
                        {user.email}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 items-center">
                          {user.is_superuser && (
                            <span className="px-3 py-1 bg-primary/20 text-primary border border-primary rounded-full text-xs font-mono animate-pulse-glow">
                              SUPERUSER
                            </span>
                          )}
                          {user.roles?.map((role) => (
                            <span
                              key={role.id}
                              className="px-3 py-1 bg-glass border border-border rounded-full text-xs font-mono text-text-muted"
                            >
                              {role.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
                          user.is_active
                            ? 'bg-accent/20 text-accent border-accent'
                            : 'bg-danger/20 text-danger border-danger'
                        }`}>
                          {user.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 glass-card border border-border rounded hover:border-primary hover:shadow-glow-sm transition-all duration-300"
                          >
                            <Edit className="h-4 w-4 text-primary" />
                          </button>
                          <button
                            onClick={() => handleToggleUserActive(user)}
                            className="p-2 glass-card border border-border rounded hover:border-accent hover:shadow-glow-sm transition-all duration-300"
                            title={user.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {user.is_active ? (
                              <PowerOff className="h-4 w-4 text-danger" />
                            ) : (
                              <Power className="h-4 w-4 text-accent" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
};

export default SuperAdminDashboard;
