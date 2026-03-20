import { NavLink } from 'react-router-dom'
import { dashboardLinks } from './navigation'

export function Sidebar() {
  return (
    <aside className="rounded-2xl border border-primary2/20 bg-primary p-4 text-white shadow-sm">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-200">
        Dashboard
      </p>
      <nav className="flex flex-col gap-2">
        {dashboardLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? 'bg-white text-primary'
                  : 'text-blue-100 hover:bg-primary2 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
