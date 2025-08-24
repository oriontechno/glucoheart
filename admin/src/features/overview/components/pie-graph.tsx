'use client';

import * as React from 'react';
import { IconTrendingUp } from '@tabler/icons-react';
import { Label, Pie, PieChart } from 'recharts';
import dynamic from 'next/dynamic';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { ArticlesPieChartResponse } from '@/types/overview';

// Generate gray colors based on number of categories
// Examples:
// - 1 category: [60%] (middle gray)
// - 2 categories: [25%, 85%] (light to dark)
// - 3 categories: [25%, 55%, 85%] (light, medium, dark)
// - 4 categories: [25%, 45%, 65%, 85%] (evenly distributed)
const generateGrayColors = (categoryCount: number) => {
  const minGray = 25; // lightest gray (25% darkness) - avoid too light on dark bg
  const maxGray = 85; // darkest gray (85% darkness) - avoid black on dark bg

  if (categoryCount === 1) {
    return [`hsl(0, 0%, ${60}%)`]; // middle gray for single category
  }

  const colors = [];
  for (let i = 0; i < categoryCount; i++) {
    // Calculate evenly distributed gray values
    const grayValue = minGray + (i * (maxGray - minGray)) / (categoryCount - 1);
    colors.push(`hsl(0, 0%, ${Math.round(grayValue)}%)`);
  }

  return colors;
};

interface PieGraphProps {
  pieData?: ArticlesPieChartResponse | null;
}

function PieGraphComponent({ pieData }: PieGraphProps) {
  // Check if we have valid data
  if (!pieData || !pieData.categories || pieData.categories.length === 0) {
    return (
      <Card className='@container/card'>
        <CardHeader>
          <CardTitle>Articles by Category</CardTitle>
          <CardDescription>
            Distribution of published articles across categories
          </CardDescription>
        </CardHeader>
        <CardContent className='flex h-[250px] items-center justify-center'>
          <div className='text-center'>
            <p className='text-muted-foreground text-sm'>
              No article data available
            </p>
            <p className='text-muted-foreground mt-1 text-xs'>
              {pieData ? 'No categories found' : 'Failed to load data'}
            </p>
            {pieData && (
              <p className='text-muted-foreground mt-2 text-xs'>
                Total articles: {pieData.total_articles_matched || 0}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = React.useMemo(() => {
    // Generate gray colors based on number of categories
    const grayColors = generateGrayColors(pieData.categories.length);

    const data = pieData.categories.map((category, index) => ({
      name: category.name,
      count: category.count,
      percentage: category.percentage,
      fill: grayColors[index] || grayColors[0]
    }));

    console.log('Chart data with gray colors:', data);
    console.log('Generated colors:', grayColors);
    return data;
  }, [pieData]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      count: {
        label: 'Articles'
      }
    };

    chartData.forEach((item) => {
      config[item.name.toLowerCase().replace(/\s+/g, '_')] = {
        label: item.name,
        color: item.fill
      };
    });

    return config;
  }, [chartData]);

  const totalCount = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const topCategory = chartData[0];
  const topPercentage: number = topCategory
    ? pieData &&
      pieData.categories.length > 0 &&
      pieData.categories[0].percentage !== undefined
      ? pieData.categories[0].percentage
      : (topCategory.count / totalCount) * 100
    : 0;

  return (
    <Card className='@container/card'>
      <CardHeader>
        <CardTitle>Articles by Category</CardTitle>
        <CardDescription>
          <span className='hidden @[540px]/card:block'>
            Distribution of published articles across categories
          </span>
          <span className='@[540px]/card:hidden'>Article distribution</span>
        </CardDescription>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='mx-auto aspect-square h-[250px]'
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey='count'
              nameKey='name'
              innerRadius={70}
              outerRadius={120}
              strokeWidth={1}
              stroke='rgba(255, 255, 255, 0.1)'
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor='middle'
                        dominantBaseline='middle'
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className='fill-foreground text-3xl font-bold'
                        >
                          {totalCount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className='fill-muted-foreground text-sm'
                        >
                          Total Articles
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className='flex-col gap-2 text-sm'>
        {topCategory && (
          <div className='flex items-center gap-2 leading-none font-medium'>
            {topCategory.name} leads with {topPercentage.toFixed(1)}%{' '}
            <IconTrendingUp className='h-4 w-4' />
          </div>
        )}
      </CardFooter>
    </Card>
  );
}

// Export with dynamic loading to prevent SSR issues
export const PieGraph = dynamic(() => Promise.resolve(PieGraphComponent), {
  ssr: false,
  loading: () => (
    <Card className='@container/card'>
      <CardHeader>
        <CardTitle>Articles by Category</CardTitle>
        <CardDescription>Loading chart...</CardDescription>
      </CardHeader>
      <CardContent className='flex h-[250px] items-center justify-center'>
        <div className='text-center'>
          <p className='text-muted-foreground text-sm'>Loading pie chart...</p>
        </div>
      </CardContent>
    </Card>
  )
});
