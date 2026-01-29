
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { BrandingProvider } from './contexts/BrandingContext';
import { MainLayout } from './components/layout/MainLayout';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import { Purchases, Settings } from './pages/LoadablePages';
import { UserList } from './pages/Users/UserList';
import { AccessRoute } from './components/Auth/AccessRoute';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { ProfilePage } from './pages/Profile/Profile';
import { ProductsPage } from './pages/Products/ProductsPage';
import { RequisitionsPage } from './pages/Inventory/RequisitionsPage';
import { UnitsPage } from './pages/Settings/Units/UnitsPage';
import { SuppliersPage } from './pages/Purchases/Suppliers/SuppliersPage';
import { SupplierDetailsPage } from './pages/Purchases/Suppliers/SupplierDetailsPage';
import { QuotationsPage } from './pages/Purchases/QuotationsPage';
import { QuotationForm } from './pages/Purchases/QuotationForm';
import { InventoryPage } from './pages/Inventory/InventoryPage';
import { ProductDetailsPage } from './pages/Inventory/ProductDetailsPage';
import { InventoryMovementsPage } from './pages/Inventory/InventoryMovementsPage';
import { LogsPage } from './pages/Logs/LogsPage';
import { CategoriesPage } from './pages/Categories/CategoriesPage';
import { MaintenanceDashboard } from './pages/Maintenance/MaintenanceDashboard';
import { ServiceOrderForm } from './pages/Maintenance/ServiceOrderForm';
import { CategoriesPage as MaintenanceCategoriesPage } from './pages/Maintenance/CategoriesPage';
import { TypesPage as MaintenanceTypesPage } from './pages/Maintenance/TypesPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BrandingProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            <Route path="/" element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />

              {/* Inventory Module - Access: Admin, Manager, Administrative OR 'inventory' permission */}
              <Route path="inventory" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="inventory">
                  <InventoryPage />
                </AccessRoute>
              } />
              <Route path="inventory/product/:id" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="inventory">
                  <ProductDetailsPage />
                </AccessRoute>
              } />
              <Route path="inventory/movements" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="inventory">
                  <InventoryMovementsPage />
                </AccessRoute>
              } />
              <Route path="inventory/products" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="inventory">
                  <ProductsPage />
                </AccessRoute>
              } />

              <Route path="inventory/categories" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="inventory">
                  <CategoriesPage />
                </AccessRoute>
              } />

              {/* Requisitions - Available to all authenticated users */}
              <Route path="inventory/requisitions" element={<RequisitionsPage />} />

              {/* Maintenance Module - Access: All Users */}
              <Route path="maintenance" element={<MaintenanceDashboard />} />
              <Route path="maintenance/os/new" element={<ServiceOrderForm />} />
              <Route path="maintenance/os/:id" element={<ServiceOrderForm />} />
              <Route path="maintenance/categories" element={
                <AccessRoute allowedRoles={['admin', 'manager']}>
                  <MaintenanceCategoriesPage />
                </AccessRoute>
              } />
              <Route path="maintenance/types" element={
                <AccessRoute allowedRoles={['admin', 'manager']}>
                  <MaintenanceTypesPage />
                </AccessRoute>
              } />

              {/* Purchases Module - Access: Admin, Manager OR 'purchases' permission */}
              <Route path="purchases" element={
                <AccessRoute requiredPermission="purchases">
                  <Purchases />
                </AccessRoute>
              } />
              <Route path="purchases/products" element={
                <AccessRoute requiredPermission="purchases">
                  <ProductsPage />
                </AccessRoute>
              } />
              {/* Suppliers - Access: Admin, Manager, Administrative OR 'purchases' permission */}
              <Route path="purchases/suppliers" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="purchases">
                  <SuppliersPage />
                </AccessRoute>
              } />
              <Route path="purchases/suppliers/:id" element={
                <AccessRoute allowedRoles={['administrative']} requiredPermission="purchases">
                  <SupplierDetailsPage />
                </AccessRoute>
              } />

              {/* Quotations */}
              <Route path="purchases/quotations" element={
                <AccessRoute requiredPermission="purchases">
                  <QuotationsPage />
                </AccessRoute>
              } />
              <Route path="purchases/quotations/new" element={
                <AccessRoute requiredPermission="purchases">
                  <QuotationForm />
                </AccessRoute>
              } />
              <Route path="purchases/quotations/:id" element={
                <AccessRoute requiredPermission="purchases">
                  <QuotationForm />
                </AccessRoute>
              } />


              <Route path="users" element={
                <AccessRoute allowedRoles={['admin', 'manager']}>
                  <UserList />
                </AccessRoute>
              } />

              <Route path="settings" element={
                <AccessRoute allowedRoles={['admin']}>
                  <Settings />
                </AccessRoute>
              } />

              <Route path="settings/units" element={
                <AccessRoute allowedRoles={['admin', 'manager']}>
                  <UnitsPage />
                </AccessRoute>
              } />

              <Route path="logs" element={
                <AccessRoute allowedRoles={['admin', 'manager']}>
                  <LogsPage />
                </AccessRoute>
              } />

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
