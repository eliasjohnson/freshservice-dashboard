'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '../lib/utils'
import { BarChart3, Users, Activity, Settings, Menu, X } from 'lucide-react'
import { Button } from './ui/button'

interface SidebarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
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

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn(
      "flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex items-center px-3 py-4">
        {!isCollapsed ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-lg font-bold tracking-tight">Pattern ITSM</h1>
                <p className="text-xs text-muted-foreground">IT Support Dashboard</p>
              </div>
            </div>
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center w-full">
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                className="h-8 w-8 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
      
      <nav className="flex-1 space-y-1 px-2 py-2">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center text-sm font-medium rounded-md transition-colors group relative",
                isCollapsed ? "px-2 py-3 justify-center" : "px-3 py-2",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={isCollapsed ? item.title : undefined}
            >
              <Icon className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
              {!isCollapsed && (
                <div>
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs opacity-75">{item.description}</div>
                </div>
              )}
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded-md border shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                  <div className="font-medium">{item.title}</div>
                  <div className="opacity-75">{item.description}</div>
                </div>
              )}
            </Link>
          )
        })}
      </nav>
      
      {!isCollapsed && (
        <div className="border-t px-3 py-2">
          <div className="text-xs text-muted-foreground px-3 py-2">
            <div>Last updated: {new Date().toLocaleTimeString()}</div>
            <div className="mt-1">Data from Freshservice API</div>
          </div>
        </div>
      )}
    </div>
  )
} 