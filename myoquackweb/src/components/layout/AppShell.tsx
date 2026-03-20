import { NavLink, Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { Sidebar } from './Sidebar'
import { dashboardLinks } from './navigation'

export function AppShell() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-softBlue via-sky-50 to-white">
      <Navbar />
      <div className="w-full px-3 pb-8 pt-4 sm:px-4 md:pt-6 lg:px-8 xl:px-10 2xl:px-14">
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 md:mb-4 md:hidden">
          {dashboardLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-white text-primary shadow-sm ring-1 ring-blue-100'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-6">
          <div className="hidden self-start md:sticky md:top-24 md:block">
            <Sidebar />
          </div>
          <main className="min-w-0 space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
