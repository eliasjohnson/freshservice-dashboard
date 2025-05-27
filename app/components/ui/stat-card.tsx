import React from 'react';
import { Card, CardContent } from "./card";
import { cn } from "../../lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isUpward: boolean;
  };
  subtitle?: string;
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle,
  className 
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h4 className="text-3xl font-bold">{value}</h4>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span 
                  className={cn(
                    "text-sm flex items-center",
                    trend.isUpward ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {trend.isUpward ? '↑' : '↓'} {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  vs last period
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div
              className={cn(
                "flex items-center justify-center rounded-full p-3",
                "bg-secondary text-primary"
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 