import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./card";
import { cn } from "../../lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  chart: React.ReactNode;
  filter?: React.ReactNode;
  className?: string;
}

export function ChartCard({ 
  title, 
  description, 
  chart, 
  filter,
  className
}: ChartCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {filter && <div className="ml-auto">{filter}</div>}
      </CardHeader>
      <CardContent className="p-6">
        {chart}
      </CardContent>
    </Card>
  );
} 