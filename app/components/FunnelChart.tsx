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

// Solid, accessible palette tuned for dark mode
const COLORS = ['hsl(221.2 83.2% 53.3%)','hsl(215.3 78.2% 55.3%)','hsl(210.2 73.2% 58.3%)','hsl(142.1 76.2% 36.3%)','hsl(24.6 95% 53.1%)']

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
      <RechartsFC>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: 6,
            boxShadow: '0 6px 16px rgba(0,0,0,0.35)'
          }}
          formatter={(value: number, _name: any, { payload }: any) => [value, payload?.name]}
        />
        <Funnel
          dataKey="value"
          data={dataWithColors}
          isAnimationActive
          nameKey="name"
          stroke="rgba(255,255,255,0.5)"
        >
          <LabelList
            position="center"
            formatter={(val: string) => `${val}`}
            fill="hsl(var(--foreground))"
            stroke="none"
            dataKey="name"
            fontSize={14}
          />
        </Funnel>
      </RechartsFC>
    </ResponsiveContainer>
  )
} 