'use client'

import React from 'react'

interface FunnelStage {
  name: string
  value: number
  description: string
  percentage: number
}

interface FunnelStageDetailsProps {
  data: FunnelStage[]
}

export function FunnelStageDetails({ data }: FunnelStageDetailsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No funnel data available</p>
      </div>
    )
  }

  const maxValue = data[0]?.value || 1

  // Enhanced color palette with better gradients
  const stageColors = [
    { 
      bg: 'from-blue-500/20 to-blue-600/30', 
      border: 'border-blue-500/40',
      text: 'text-blue-600',
      accent: 'bg-blue-500'
    },
    { 
      bg: 'from-amber-500/20 to-amber-600/30', 
      border: 'border-amber-500/40',
      text: 'text-amber-600',
      accent: 'bg-amber-500'
    },
    { 
      bg: 'from-emerald-500/20 to-emerald-600/30', 
      border: 'border-emerald-500/40',
      text: 'text-emerald-600',
      accent: 'bg-emerald-500'
    }
  ]

  return (
    <div className="space-y-2 pb-1">
      {data.map((stage, index) => {
        const colors = stageColors[index % stageColors.length]
        const widthPercentage = (stage.value / maxValue) * 100
        
        return (
          <div
            key={index}
            className="group relative overflow-hidden rounded-lg border bg-card p-3 transition-all hover:shadow-sm"
          >
            {/* Background progress bar */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r ${colors.bg} transition-all duration-500 pointer-events-none`}
              style={{ width: `${widthPercentage}%` }}
            />
            
            {/* Content */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <div className={`h-3 w-3 rounded-full ${colors.accent} shadow-sm flex-shrink-0`} />
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground truncate">{stage.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{stage.description}</p>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0 ml-3">
                <div className="text-lg font-bold text-foreground">{stage.value}</div>
                {index > 0 && (
                  <div className={`text-sm font-medium ${colors.text}`}>
                    {stage.percentage}%
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
} 