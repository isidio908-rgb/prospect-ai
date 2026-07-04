import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import LeadDetails from './pages/LeadDetails';
import CrmKanban from './pages/CrmKanban';
import CollectionHistory from './pages/CollectionHistory';
import Autopilot from './pages/Autopilot';
import AutopilotReplies from './pages/AutopilotReplies';
import AutopilotTemplates from './pages/AutopilotTemplates';
import Profile from './pages/Profile';
import Credentials from './pages/Credentials';
import WhatsAppSettings from './pages/WhatsAppSettings';
import Collect from './pages/Collect';
import './store/themeStore';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function DashboardRoute() {
  return (
    <PrivateRoute>
      <Layout>
        <Dashboard />
      </Layout>
    </PrivateRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardRoute />} />
        <Route path="/dashboard" element={<DashboardRoute />} />
        
        <Route
          path="/collect"
          element={
            <PrivateRoute>
              <Layout>
                <Collect />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/collections"
          element={
            <PrivateRoute>
              <Layout>
                <CollectionHistory />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/leads"
          element={
            <PrivateRoute>
              <Layout>
                <Leads />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/crm"
          element={
            <PrivateRoute>
              <Layout>
                <CrmKanban />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/autopilot"
          element={
            <PrivateRoute>
              <Layout>
                <Autopilot />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/autopilot/replies"
          element={
            <PrivateRoute>
              <Layout>
                <AutopilotReplies />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/autopilot/templates"
          element={
            <PrivateRoute>
              <Layout>
                <AutopilotTemplates />
              </Layout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/leads/:id"
          element={
            <PrivateRoute>
              <Layout>
                <LeadDetails />
              </Layout>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/credentials"
          element={
            <PrivateRoute>
              <Layout>
                <Credentials />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Layout>
                <Profile />
              </Layout>
            </PrivateRoute>
          }
        />

        <Route
          path="/whatsapp"
          element={
            <PrivateRoute>
              <Layout>
                <WhatsAppSettings />
              </Layout>
            </PrivateRoute>
          }
        />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
