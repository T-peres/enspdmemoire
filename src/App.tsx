import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { DocumentManagementWrapper } from "@/components/documents/DocumentManagementWrapper";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Topics from "./pages/Topics";
import MyThesis from "./pages/MyThesis";
import MyProposedTopics from "./pages/MyProposedTopics";
import Profile from "./pages/Profile";
import DepartmentDashboard from "./pages/DepartmentDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import DepartmentHeadDashboard from "./pages/DepartmentHeadDashboard";
import JuryDashboard from "./pages/JuryDashboard";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <DocumentManagementWrapper>
            <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/auth" element={<Auth />} />
            <Route path="/topics" element={
              <ProtectedRoute>
                <Topics />
              </ProtectedRoute>
            } />
            <Route path="/my-thesis" element={
              <ProtectedRoute>
                <MyThesis />
              </ProtectedRoute>
            } />
            <Route path="/my-proposed-topics" element={
              <ProtectedRoute>
                <MyProposedTopics />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/supervisor-dashboard" element={
              <ProtectedRoute requiredRole="supervisor">
                <SupervisorDashboard />
              </ProtectedRoute>
            } />
            <Route path="/department-head-dashboard" element={
              <ProtectedRoute requiredRole="department_head">
                <DepartmentHeadDashboard />
              </ProtectedRoute>
            } />
            <Route path="/department-dashboard" element={
              <ProtectedRoute requiredRole="department_head">
                <DepartmentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/jury-dashboard" element={
              <ProtectedRoute requiredRole="jury">
                <JuryDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requiredRole="admin">
                <Admin />
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </DocumentManagementWrapper>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
