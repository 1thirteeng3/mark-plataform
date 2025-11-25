import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { useAuthStore } from './store/authStore';
import { LoginPage } from './components/LoginPage';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';

function App() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      {!isAuthenticated ? (
        <LoginPage />
      ) : user?.role === 'SUPER_ADMIN' ? (
        <SuperAdminDashboard />
      ) : user?.role === 'ADMIN' ? (
        <AdminDashboard />
      ) : (
        <StudentDashboard />
      )}
    </QueryClientProvider>
  );
}

export default App;
