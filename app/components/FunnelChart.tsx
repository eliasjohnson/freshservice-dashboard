'use client'

import React from 'react'
import { FunnelChart as RechartsFC, Funnel, LabelList, Tooltip, ResponsiveContainer } from 'recharts'

interface FunnelStage {
  name: string
  value: number
  description: string
  percentage: number
}

interface FunnelChartProps {
  data: FunnelStage[]
}

// Solid color palette inspired by the user's example
const COLORS = ['#8884d8', '#83a6e3', '#8dd1e1', '#82ca9d', '#a4de6c'];

export function FunnelChart({ data }: FunnelChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-center">
          <p>No funnel data available</p>
        </div>
      </div>
    )
  }

  // Add solid colors to each data point for recharts to use
  const dataWithColors = data.map((entry, index) => ({
    ...entry,
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsFC width={730} height={250}>
        <Tooltip />
        
        <Funnel
          dataKey="value"
          data={dataWithColors}
          isAnimationActive={true}
          nameKey="name"
        >
          <LabelList 
            position="right"
            fill="hsl(var(--foreground))" 
            stroke="none"
            dataKey="name"
          />
        </Funnel>
      </RechartsFC>
    </ResponsiveContainer>
  )
} 