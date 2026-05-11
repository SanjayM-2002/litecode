import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import { RequireAuth } from '@/components/RequireAuth'
import { LoginPage } from '@/pages/Login'
import { SignupPage } from '@/pages/Signup'
import { ProblemsPage } from '@/pages/Problems'
import { ProblemDetailPage } from '@/pages/ProblemDetail'
import { SubmissionsPage } from '@/pages/Submissions'
import { ProfilePage } from '@/pages/Profile'
import { TopicsPage } from '@/pages/Topics'
import { DiscussPage } from '@/pages/Discuss'
import { DiscussNewPage } from '@/pages/DiscussNew'
import { DiscussPostPage } from '@/pages/DiscussPost'

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
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/problems" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
