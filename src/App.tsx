
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Purchases, Settings } from './pages/LoadablePages';
import { UserList } from './pages/Users/UserList';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { ProfilePage } from './pages/Profile/Profile';
import { ProductsPage } from './pages/Products/ProductsPage';
import { RequisitionsPage } from './pages/Inventory/RequisitionsPage';
import { UnitsPage } from './pages/Settings/Units/UnitsPage';
import { SuppliersPage } from './pages/Purchases/Suppliers/SuppliersPage';
import { InventoryPage } from './pages/Inventory/InventoryPage';
import { InventoryMovementsPage } from './pages/Inventory/InventoryMovementsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />

              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/movements" element={<InventoryMovementsPage />} />
              <Route path="inventory/products" element={<ProductsPage />} />
              <Route path="inventory/requisitions" element={<RequisitionsPage />} />

              <Route path="purchases" element={<Purchases />} />
              <Route path="purchases/products" element={<ProductsPage />} />
              <Route path="purchases/suppliers" element={<SuppliersPage />} />


              <Route path="users" element={<UserList />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/units" element={<UnitsPage />} />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrandingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
