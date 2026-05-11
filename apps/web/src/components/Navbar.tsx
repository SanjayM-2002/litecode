import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Code2,
  FileCode2,
  ListChecks,
  LogOut,
  MessageSquare,
  Sparkles,
  Tags,
  User as UserIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { fetchMe } from '@/lib/api/queries'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-foreground',
    isActive ? 'text-foreground' : 'text-muted-foreground'
  )

export function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  // Reuses the cached `me` query from Profile/Plans pages — no extra request.
  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: !!user,
  })
  const isPremium = me?.tier === 'PREMIUM'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/problems" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#ffa116] text-black">
              <Code2 className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold tracking-tight">litecode</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/problems" className={navLinkClass}>
              <FileCode2 className="h-4 w-4" />
              Problems
            </NavLink>
            <NavLink to="/topics" className={navLinkClass}>
              <Tags className="h-4 w-4" />
              Topics
            </NavLink>
            <NavLink to="/discuss" className={navLinkClass}>
              <MessageSquare className="h-4 w-4" />
              Discuss
            </NavLink>
            <NavLink to="/submissions" className={navLinkClass}>
              <ListChecks className="h-4 w-4" />
              Submissions
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && !isPremium && (
            <Link
              to="/plans"
              className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#ffa116]/15 px-3 py-1.5 text-xs font-semibold text-[#ffa116] transition-colors hover:bg-[#ffa116]/25"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Upgrade
            </Link>
          )}
          {user && isPremium && (
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-md bg-[#ffb800]/15 px-3 py-1.5 text-xs font-semibold text-[#ffb800]">
              <Sparkles className="h-3.5 w-3.5" />
              Premium
            </span>
          )}
          <ThemeToggle />
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer">
                <Avatar name={user.name ?? user.email} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name ?? 'No name'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/profile')}>
                  <UserIcon className="h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/submissions')}>
                  <ListChecks className="h-4 w-4" />
                  My Submissions
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/plans')}>
                  <Sparkles className="h-4 w-4" />
                  {isPremium ? 'Manage subscription' : 'Upgrade to Premium'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  )
}
