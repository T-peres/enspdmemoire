import React, { useMemo, useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface OptimizedChartProps {
  data: ChartData[];
  config: any;
  width?: number;
  height?: number;
  className?: string;
}

export const OptimizedChart: React.FC<OptimizedChartProps> = ({
  data,
  config,
  width = 885,
  height = 300,
  className = "h-[300px] w-full"
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const memoizedData = useMemo(() => data, [data]);

  if (!isMounted || !memoizedData.length) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Chargement du graphique...</p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer config={config} className={className}>
      <PieChart width={width} height={height}>
        <Pie
          data={memoizedData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {memoizedData.map((entry, index) => (
            <Cell key={`cell-${entry.name}-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend />
      </PieChart>
    </ChartContainer>
  );
};