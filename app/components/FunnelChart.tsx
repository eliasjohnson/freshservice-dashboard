'use client'

import React, { useEffect, useState } from 'react'

interface FunnelStage {
  name: string
  value: number
  description: string
  percentage: number
}

interface FunnelChartProps {
  data: FunnelStage[]
}

export function FunnelChart({ data }: FunnelChartProps) {
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setIsAnimated(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No funnel data available</p>
      </div>
    )
  }

  const maxValue = data[0]?.value || 1
  
  // Define colors for each funnel stage
  const colors = [
    { fill: '#3B82F6', text: 'white' },  // Blue for Submitted
    { fill: '#8B5CF6', text: 'white' },  // Purple for In Progress
    { fill: '#10B981', text: 'white' }   // Green for Resolved
  ]

  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg
        viewBox="0 0 500 250"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {data.map((stage, index) => {
          // Calculate dimensions for each stage
          const totalHeight = 220;
          const stageHeight = totalHeight / data.length;
          const yPosition = 15 + (index * stageHeight);
          
          // Make funnel wider at top, narrower at bottom
          const maxWidth = 400;
          const minWidth = 180;
          const widthReduction = (maxWidth - minWidth) / (data.length - 1);
          const stageWidth = maxWidth - (index * widthReduction);
          
          // Center the funnel horizontally
          const xPosition = (500 - stageWidth) / 2;
          
          return (
            <g key={index}>
              {/* Funnel segment with animation */}
              <polygon
                points={`
                  ${xPosition},${yPosition}
                  ${xPosition + stageWidth},${yPosition}
                  ${xPosition + stageWidth - (widthReduction/2)},${yPosition + stageHeight}
                  ${xPosition + (widthReduction/2)},${yPosition + stageHeight}
                `}
                fill={colors[index].fill}
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="1"
                className="transition-all duration-300 hover:brightness-110"
                style={{
                  opacity: isAnimated ? 1 : 0,
                  transform: isAnimated ? 'scale(1)' : 'scale(0.8)',
                  transformOrigin: 'center',
                  transition: `all 0.6s ease-out ${index * 0.15}s`
                }}
              />
              
              {/* Stage name with animation */}
              <text
                x={250}
                y={yPosition + (stageHeight * 0.4)}
                textAnchor="middle"
                className="fill-white font-medium"
                style={{ 
                  fontSize: '14px',
                  opacity: isAnimated ? 1 : 0,
                  transition: `opacity 0.6s ease-out ${index * 0.15 + 0.3}s`
                }}
              >
                {stage.name}
              </text>
              
              {/* Value with animation */}
              <text
                x={250}
                y={yPosition + (stageHeight * 0.6)}
                textAnchor="middle"
                className="fill-white font-bold"
                style={{ 
                  fontSize: '18px',
                  opacity: isAnimated ? 1 : 0,
                  transition: `opacity 0.6s ease-out ${index * 0.15 + 0.4}s`
                }}
              >
                {stage.value} tickets
              </text>
              
              {/* Percentage with animation (only for non-submitted stages) */}
              {index > 0 && (
                <text
                  x={450}
                  y={yPosition + (stageHeight * 0.5)}
                  textAnchor="end"
                  className="fill-white font-semibold"
                  style={{ 
                    fontSize: '16px',
                    opacity: isAnimated ? 1 : 0,
                    transition: `opacity 0.6s ease-out ${index * 0.15 + 0.5}s`
                  }}
                >
                  {stage.percentage}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  )
} 