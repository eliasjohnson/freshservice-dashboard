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

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E42', '#EF4444']

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

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsFC
        width={730}
        height={250}
        data={data}
      >
        <Tooltip 
          formatter={(value) => [`${value} tickets`, 'Count']}
          labelFormatter={(name) => `Stage: ${name}`}
        />
        <Funnel
          dataKey="value"
          data={data}
          isAnimationActive
          paddingAngle={3}
          nameKey="name"
        >
          <LabelList 
            position="right"
            fill="#fff" 
            stroke="none"
            dataKey="name"
            fontSize={12}
          />
          <LabelList 
            position="left"
            fill="#888" 
            stroke="none"
            dataKey="percentage"
            formatter={(value: number) => `${value}%`}
            fontSize={12}
          />
          {
            data.map((entry, index) => (
              <Funnel 
                key={`funnel-${index}`}
                nameKey="name"
                dataKey="value" 
                fill={COLORS[index % COLORS.length]} 
                stroke={COLORS[index % COLORS.length]}
              />
            ))
          }
        </Funnel>
      </RechartsFC>
    </ResponsiveContainer>
  )
} 