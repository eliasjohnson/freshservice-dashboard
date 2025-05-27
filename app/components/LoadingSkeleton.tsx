'use client'

import { Card, CardContent, CardHeader } from "./ui/card"
import { Skeleton } from "./ui/skeleton"

export function StatsCardSkeleton() {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChartCardSkeleton({ title }: { title: string }) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {title.includes('Pie') || title.includes('Workload') ? (
            // Pie chart skeleton
            <div className="flex items-center justify-center h-full">
              <div className="relative">
                <Skeleton className="h-48 w-48 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Skeleton className="h-16 w-16 rounded-full bg-white" />
                </div>
              </div>
            </div>
          ) : (
            // Bar/Line chart skeleton
            <div className="space-y-3">
              <div className="flex items-end space-x-2 h-64">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center space-y-2">
                    <Skeleton 
                      className="w-full rounded-t" 
                      style={{ height: `${Math.random() * 150 + 50}px` }}
                    />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function AgentTableSkeleton() {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <Skeleton className="h-4 w-12 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function FilterBarSkeleton() {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-28" />
      </div>
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-20" />
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6 bg-gray-50/50 min-h-screen">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex space-x-3">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Connection Status Skeleton */}
      <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>

      {/* Filter Bar Skeleton */}
      <FilterBarSkeleton />

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCardSkeleton title="Tickets by Status" />
        <ChartCardSkeleton title="Tickets by Priority (Pie)" />
        <ChartCardSkeleton title="Weekly Trend" />
        <ChartCardSkeleton title="Agent Workload (Pie)" />
        <div className="lg:col-span-2">
          <ChartCardSkeleton title="Tickets by Category" />
        </div>
        <div className="lg:col-span-2">
          <ChartCardSkeleton title="Resolution Times" />
        </div>
      </div>

      {/* Agent Performance Table Skeleton */}
      <AgentTableSkeleton />
    </div>
  )
} 