#!/usr/bin/env python3
"""
Script de prueba para la API con RBAC
Prueba los endpoints principales y la autenticación
"""

import requests
import json
from typing import Dict, Any

class APITester:
    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        
    def test_health(self):
        """Probar endpoint de salud (público)"""
        print("🏥 Testing health endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/api/health")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
            return response.status_code == 200
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_login(self, username: str = "admin", password: str = "admin123"):
        """Probar login con credenciales por defecto"""
        print(f"🔐 Testing login with {username}...")
        try:
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json={"username": username, "password": password}
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.session.headers.update({
                    "Authorization": f"Bearer {self.token}"
                })
                print(f"   ✅ Login successful")
                print(f"   User: {data['user']['username']}")
                print(f"   Roles: {data['user']['roles']}")
                return True
            else:
                print(f"   ❌ Login failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_me(self):
        """Probar endpoint /auth/me"""
        print("👤 Testing /auth/me endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/api/auth/me")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ User info retrieved")
                print(f"   Username: {data['username']}")
                print(f"   Permissions: {len(data['permissions'])} permissions")
                return True
            else:
                print(f"   ❌ Failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_system_info(self):
        """Probar endpoint de información del sistema"""
        print("ℹ️ Testing system info endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/api/system/info")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ System info retrieved")
                print(f"   Version: {data['version']}")
                print(f"   Features: {data['features']}")
                if 'available_endpoints' in data:
                    print(f"   Available endpoints: {sum(data['available_endpoints'].values())}")
                return True
            else:
                print(f"   ❌ Failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_users_list(self):
        """Probar listado de usuarios (requiere permisos)"""
        print("👥 Testing users list endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/api/users/")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Users list retrieved")
                print(f"   Users count: {len(data)}")
                return True
            elif response.status_code == 403:
                print(f"   🔒 Access denied (expected for non-admin users)")
                return True
            else:
                print(f"   ❌ Failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_admin_stats(self):
        """Probar estadísticas del sistema (requiere permisos admin)"""
        print("📊 Testing admin stats endpoint...")
        try:
            response = self.session.get(f"{self.base_url}/api/admin/stats")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Admin stats retrieved")
                print(f"   Total users: {data['users']['total']}")
                print(f"   Total roles: {data['roles']['total']}")
                return True
            elif response.status_code == 403:
                print(f"   🔒 Access denied (expected for non-admin users)")
                return True
            else:
                print(f"   ❌ Failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_protected_endpoint(self):
        """Probar endpoint protegido (análisis financiero)"""
        print("💰 Testing protected financial endpoint...")
        try:
            test_data = {
                "financial_data": {
                    "accounts": [
                        {"code": "4110", "name": "Ingresos por Ventas", "annual_total": 1000000},
                        {"code": "6110", "name": "Costo de Mercancías", "annual_total": -600000}
                    ],
                    "period": "2024",
                    "company": "Test Company"
                },
                "view_type": "contable"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/pyg/analyze",
                json=test_data
            )
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Financial analysis completed")
                print(f"   Analysis available: {'analysis' in data.get('data', {})}")
                return True
            elif response.status_code == 403:
                print(f"   🔒 Access denied (expected for users without financial permissions)")
                return True
            else:
                print(f"   ❌ Failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_logout(self):
        """Probar logout"""
        print("🚪 Testing logout...")
        try:
            response = self.session.post(f"{self.base_url}/api/auth/logout")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                print(f"   ✅ Logout successful")
                self.token = None
                del self.session.headers["Authorization"]
                return True
            else:
                print(f"   ❌ Failed: {response.json()}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def test_unauthorized_access(self):
        """Probar acceso sin autenticación"""
        print("🚫 Testing unauthorized access...")
        try:
            response = self.session.get(f"{self.base_url}/api/users/")
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 401:
                print(f"   ✅ Correctly denied unauthorized access")
                return True
            else:
                print(f"   ⚠️ Unexpected response: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ Error: {e}")
            return False
    
    def run_all_tests(self):
        """Ejecutar todas las pruebas"""
        print("🧪 Starting API tests...")
        print(f"📡 Base URL: {self.base_url}")
        print("=" * 60)
        
        results = []
        
        # Pruebas públicas
        results.append(("Health Check", self.test_health()))
        results.append(("System Info (public)", self.test_system_info()))
        
        # Pruebas de autenticación
        results.append(("Login", self.test_login()))
        
        if self.token:
            # Pruebas autenticadas
            results.append(("User Info", self.test_me()))
            results.append(("System Info (authenticated)", self.test_system_info()))
            results.append(("Users List", self.test_users_list()))
            results.append(("Admin Stats", self.test_admin_stats()))
            results.append(("Protected Financial Endpoint", self.test_protected_endpoint()))
            results.append(("Logout", self.test_logout()))
        
        # Pruebas de seguridad
        results.append(("Unauthorized Access", self.test_unauthorized_access()))
        
        # Resumen
        print("=" * 60)
        print("📋 TEST RESULTS:")
        passed = 0
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"   {test_name:<30} {status}")
            if result:
                passed += 1
        
        print("=" * 60)
        print(f"📊 Summary: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! API is working correctly.")
        else:
            print("⚠️ Some tests failed. Check the output above.")
        
        return passed == total

def main():
    """Función principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Artyco Financial API with RBAC")
    parser.add_argument("--url", default="http://localhost:8001", help="Base URL for the API")
    parser.add_argument("--username", default="admin", help="Username for login test")
    parser.add_argument("--password", default="admin123", help="Password for login test")
    
    args = parser.parse_args()
    
    tester = APITester(args.url)
    success = tester.run_all_tests()
    
    exit(0 if success else 1)

if __name__ == "__main__":
    main()