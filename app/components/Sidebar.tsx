'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../lib/utils'
import { BarChart3, Users, Activity, Settings } from 'lucide-react'

interface SidebarProps {
  className?: string
}

const sidebarItems = [
  {
    title: 'Overview',
    href: '/',
    icon: BarChart3,
    description: 'Executive dashboard and quarterly metrics'
  },
  {
    title: 'Agent Performance',
    href: '/agents',
    icon: Users,
    description: 'Individual agent analytics and workload'
  },
  // Future sections can be added here
  // {
  //   title: 'Reports',
  //   href: '/reports',
  //   icon: Activity,
  //   description: 'Custom reports and analytics'
  // },
  // {
  //   title: 'Settings',
  //   href: '/settings',
  //   icon: Settings,
  //   description: 'Dashboard configuration'
  // }
]

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-background", className)}>
      <div className="flex items-center px-6 py-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Pattern ITSM</h1>
            <p className="text-xs text-muted-foreground">IT Support Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="mr-3 h-4 w-4" />
              <div>
                <div className="font-medium">{item.title}</div>
                <div className="text-xs opacity-75">{item.description}</div>
              </div>
            </Link>
          )
        })}
      </nav>
      
      <div className="border-t px-3 py-2">
        <div className="text-xs text-muted-foreground px-3 py-2">
          <div>Last updated: {new Date().toLocaleTimeString()}</div>
          <div className="mt-1">Data from Freshservice API</div>
        </div>
      </div>
    </div>
  )
} 