import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { RequireAuth } from '@/components/RequireAuth'
import { RequireAdmin } from '@/components/RequireAdmin'
import { Toaster } from '@/components/ui/toaster'
import { LoginPage } from '@/pages/Login'
import { SignupPage } from '@/pages/Signup'
import { ProblemsPage } from '@/pages/Problems'
import { ProblemDetailPage } from '@/pages/ProblemDetail'
import { SubmissionsPage } from '@/pages/Submissions'
import { PlansPage } from '@/pages/Plans'
import { ProfilePage } from '@/pages/Profile'
import { TopicsPage } from '@/pages/Topics'
import { DiscussPage } from '@/pages/Discuss'
import { DiscussNewPage } from '@/pages/DiscussNew'
import { DiscussPostPage } from '@/pages/DiscussPost'

// Admin portal is lazy so participants never download the authoring bundle.
const AdminLayout = lazy(() =>
  import('@/admin/AdminLayout').then((m) => ({ default: m.AdminLayout }))
)
const AdminDashboardPage = lazy(() =>
  import('@/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboardPage }))
)
const AdminProblemsPage = lazy(() =>
  import('@/admin/AdminProblems').then((m) => ({ default: m.AdminProblemsPage }))
)
const ProblemEditorPage = lazy(() =>
  import('@/admin/ProblemEditor').then((m) => ({ default: m.ProblemEditorPage }))
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/problems" replace />} />
              <Route path="/problems" element={<ProblemsPage />} />
              <Route path="/problems/:slug" element={<ProblemDetailPage />} />
              <Route path="/topics" element={<TopicsPage />} />
              <Route path="/discuss" element={<DiscussPage />} />
              <Route path="/discuss/new" element={<DiscussNewPage />} />
              <Route path="/discuss/:id" element={<DiscussPostPage />} />
              <Route path="/submissions" element={<SubmissionsPage />} />
              <Route path="/plans" element={<PlansPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route element={<RequireAdmin />}>
              <Route
                path="/admin"
                element={
                  <Suspense fallback={<RouteFallback />}>
                    <AdminLayout />
                  </Suspense>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="problems" element={<AdminProblemsPage />} />
                <Route path="problems/new" element={<ProblemEditorPage />} />
                <Route path="problems/:id" element={<ProblemEditorPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/problems" replace />} />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}
