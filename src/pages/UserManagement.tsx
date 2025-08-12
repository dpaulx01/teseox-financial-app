import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Lock, Edit2, Trash2, 
  Save, X, AlertCircle, CheckCircle, Search,
  Key, Mail, User, Building
} from 'lucide-react';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_superuser: boolean;
  role_id: number;
  role?: Role;
  created_at: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions?: Permission[];
}

interface Permission {
  id: number;
  name: string;
  resource: string;
  action: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<'users' | 'roles' | 'permissions'>('users');

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role_id: 1,
    is_active: true,
    is_superuser: false
  });

  const token = localStorage.getItem('access_token');
  const config = {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        axios.get('http://localhost:8001/api/users', config),
        axios.get('http://localhost:8001/api/roles', config),
        axios.get('http://localhost:8001/api/permissions', config)
      ]);
      
      setUsers(usersRes.data);
      setRoles(rolesRes.data.roles || []);
      setPermissions(permsRes.data.permissions || []);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8001/api/users', formData, config);
      setSuccess('Usuario creado exitosamente');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear usuario');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    try {
      await axios.put(`http://localhost:8001/api/users/${editingUser.id}`, formData, config);
      setSuccess('Usuario actualizado exitosamente');
      setEditingUser(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    try {
      await axios.delete(`http://localhost:8001/api/users/${userId}`, config);
      setSuccess('Usuario eliminado exitosamente');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role_id: 1,
      is_active: true,
      is_superuser: false
    });
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      first_name: user.first_name,
      last_name: user.last_name,
      role_id: user.role_id,
      is_active: user.is_active,
      is_superuser: user.is_superuser
    });
  };

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-glass backdrop-blur-lg rounded-2xl p-6 border border-border-secondary">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-orbitron font-bold bg-gradient-primary bg-clip-text text-transparent">
              GESTIÓN RBAC
            </h1>
            <p className="text-text-secondary font-mono text-sm mt-2">
              Control de Acceso Basado en Roles
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                resetForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg transition-all font-mono"
            >
              <UserPlus className="w-4 h-4" />
              NUEVO USUARIO
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-border-secondary">
          <button
            onClick={() => setSelectedTab('users')}
            className={`px-4 py-2 font-mono text-sm transition-all ${
              selectedTab === 'users' 
                ? 'text-accent-primary border-b-2 border-accent-primary' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              USUARIOS ({users.length})
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('roles')}
            className={`px-4 py-2 font-mono text-sm transition-all ${
              selectedTab === 'roles' 
                ? 'text-accent-primary border-b-2 border-accent-primary' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              ROLES ({roles.length})
            </div>
          </button>
          <button
            onClick={() => setSelectedTab('permissions')}
            className={`px-4 py-2 font-mono text-sm transition-all ${
              selectedTab === 'permissions' 
                ? 'text-accent-primary border-b-2 border-accent-primary' 
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4" />
              PERMISOS ({permissions.length})
            </div>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-error/10 border border-error/50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error" />
          <p className="text-error font-mono text-sm">{error}</p>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4 text-error" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success/50 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success" />
          <p className="text-success font-mono text-sm">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto">
            <X className="w-4 h-4 text-success" />
          </button>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="bg-glass backdrop-blur-lg rounded-2xl p-6 border border-border-secondary">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-border-secondary rounded-lg text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary font-mono"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-secondary">
                  <th className="text-left py-3 px-4 font-mono text-text-secondary text-sm">USUARIO</th>
                  <th className="text-left py-3 px-4 font-mono text-text-secondary text-sm">EMAIL</th>
                  <th className="text-left py-3 px-4 font-mono text-text-secondary text-sm">NOMBRE</th>
                  <th className="text-left py-3 px-4 font-mono text-text-secondary text-sm">ROL</th>
                  <th className="text-left py-3 px-4 font-mono text-text-secondary text-sm">ESTADO</th>
                  <th className="text-left py-3 px-4 font-mono text-text-secondary text-sm">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border-secondary hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-mono text-sm">{user.username}</span>
                        {user.is_superuser && (
                          <span className="px-2 py-1 bg-accent-primary/20 text-accent-primary text-xs rounded-full font-mono">
                            ADMIN
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-sm text-text-secondary">{user.email}</td>
                    <td className="py-3 px-4 font-mono text-sm text-text-secondary">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-accent-secondary/20 text-accent-secondary text-xs rounded-full font-mono">
                        {roles.find(r => r.id === user.role_id)?.name || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 text-xs rounded-full font-mono ${
                        user.is_active 
                          ? 'bg-success/20 text-success' 
                          : 'bg-error/20 text-error'
                      }`}>
                        {user.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(user)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-accent-primary" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-error" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {selectedTab === 'roles' && (
        <div className="bg-glass backdrop-blur-lg rounded-2xl p-6 border border-border-secondary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <div key={role.id} className="bg-white/5 rounded-xl p-4 border border-border-secondary hover:border-accent-primary transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-white">{role.name}</h3>
                    <p className="text-text-muted text-xs font-mono">ID: {role.id}</p>
                  </div>
                </div>
                <p className="text-text-secondary text-sm font-mono mb-3">{role.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted text-xs font-mono">
                    {role.permissions?.length || 0} permisos
                  </span>
                  <button className="text-accent-primary text-sm font-mono hover:underline">
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {selectedTab === 'permissions' && (
        <div className="bg-glass backdrop-blur-lg rounded-2xl p-6 border border-border-secondary">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map((permission) => (
              <div key={permission.id} className="bg-white/5 rounded-xl p-4 border border-border-secondary">
                <div className="flex items-center gap-3 mb-2">
                  <Key className="w-4 h-4 text-accent-primary" />
                  <h3 className="font-mono font-bold text-white text-sm">{permission.name}</h3>
                </div>
                <div className="space-y-1">
                  <p className="text-text-secondary text-xs font-mono">
                    <span className="text-text-muted">Recurso:</span> {permission.resource}
                  </p>
                  <p className="text-text-secondary text-xs font-mono">
                    <span className="text-text-muted">Acción:</span> {permission.action}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingUser) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-bg border border-border-secondary rounded-2xl p-6 max-w-md w-full">
            <h2 className="text-2xl font-orbitron font-bold text-white mb-6">
              {editingUser ? 'EDITAR USUARIO' : 'CREAR USUARIO'}
            </h2>
            
            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono text-text-secondary mb-2">
                    USUARIO
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-border-secondary rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-mono text-text-secondary mb-2">
                    EMAIL
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-border-secondary rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    required
                  />
                </div>
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-mono text-text-secondary mb-2">
                    CONTRASEÑA
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-border-secondary rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    required={!editingUser}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-mono text-text-secondary mb-2">
                    NOMBRE
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-border-secondary rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-mono text-text-secondary mb-2">
                    APELLIDO
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-border-secondary rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-mono text-text-secondary mb-2">
                  ROL
                </label>
                <select
                  value={formData.role_id}
                  onChange={(e) => setFormData({...formData, role_id: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 bg-white/5 border border-border-secondary rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent-primary"
                >
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="w-4 h-4 bg-white/5 border border-border-secondary rounded"
                  />
                  <span className="text-sm font-mono text-text-secondary">ACTIVO</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_superuser}
                    onChange={(e) => setFormData({...formData, is_superuser: e.target.checked})}
                    className="w-4 h-4 bg-white/5 border border-border-secondary rounded"
                  />
                  <span className="text-sm font-mono text-text-secondary">ADMINISTRADOR</span>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-gradient-primary text-white rounded-lg font-mono hover:shadow-lg transition-all"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  {editingUser ? 'ACTUALIZAR' : 'CREAR'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingUser(null);
                    resetForm();
                  }}
                  className="flex-1 py-2 bg-white/10 text-white rounded-lg font-mono hover:bg-white/20 transition-all"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  CANCELAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}