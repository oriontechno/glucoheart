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
  // Move all hooks before any conditional logic
  const chartData = React.useMemo(() => {
    // Return empty array if no valid data
    if (!pieData || !pieData.categories || pieData.categories.length === 0) {
      return [];
    }

    // Generate gray colors based on number of categories
    const grayColors = generateGrayColors(pieData.categories.length);

    const data = pieData.categories.map((category, index) => ({
      name: category.name,
      count: category.count,
      percentage: category.percentage,
      fill: grayColors[index] || grayColors[0]
    }));

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

  // Now do conditional checks after all hooks
  const hasValidData =
    pieData && pieData.categories && pieData.categories.length > 0;

  if (!hasValidData) {
    return (
      <Card className='py-4 sm:py-0'>
        <CardHeader className='flex flex-col items-stretch border-b !p-0 sm:flex-row'>
          <div className='flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0'>
            <CardTitle>Articles by Category</CardTitle>
            <CardDescription>
              Distribution of published articles across categories
            </CardDescription>
          </div>
          <div className='flex'>
            <button
              data-active={true}
              className='data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6'
            >
              <span className='text-muted-foreground text-xs'>
                Total Articles
              </span>
              <span className='text-lg leading-none font-bold sm:text-3xl'>
                {pieData?.total_articles_matched?.toLocaleString() || '0'}
              </span>
            </button>
          </div>
        </CardHeader>
        <CardContent className='flex h-[250px] items-center justify-center px-2 pt-4 sm:px-6 sm:pt-6'>
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

  const topCategory = chartData[0];
  const topPercentage: number = topCategory
    ? pieData &&
      pieData.categories.length > 0 &&
      pieData.categories[0].percentage !== undefined
      ? pieData.categories[0].percentage
      : (topCategory.count / totalCount) * 100
    : 0;

  return (
    <Card className='py-4 sm:py-0'>
      <CardHeader className='flex flex-col items-stretch border-b !p-0 sm:flex-row'>
        <div className='flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0'>
          <CardTitle>Articles by Category</CardTitle>
          <CardDescription>
            <span className='hidden @[540px]/card:block'>
              Distribution of published articles across categories
            </span>
            <span className='@[540px]/card:hidden'>Article distribution</span>
          </CardDescription>
        </div>
        <div className='flex'>
          <button
            data-active={true}
            className='data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6'
          >
            <span className='text-muted-foreground text-xs'>
              Total Articles
            </span>
            <span className='text-lg leading-none font-bold sm:text-3xl'>
              {pieData.total_articles_matched.toLocaleString()}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='mx-auto aspect-auto h-[250px] w-full'
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
              innerRadius={60}
              outerRadius={100}
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
                          {pieData.total_articles_matched}
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
      <CardFooter className='mb-5 flex-col items-start gap-2 text-sm'>
        {topCategory && (
          <div className='line-clamp-1 flex gap-2 leading-none font-medium'>
            {topCategory.name} leads with {topPercentage.toFixed(1)}%{' '}
            <IconTrendingUp className='h-4 w-4' />
          </div>
        )}
        <div className='text-muted-foreground line-clamp-1 leading-none'>
          Distribution across categories
        </div>
      </CardFooter>
    </Card>
  );
}

// Export with dynamic loading to prevent SSR issues
export const PieGraph = dynamic(() => Promise.resolve(PieGraphComponent), {
  ssr: false,
  loading: () => (
    <Card className='py-4 sm:py-0'>
      <CardHeader className='flex flex-col items-stretch border-b !p-0 sm:flex-row'>
        <div className='flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0'>
          <CardTitle>Articles by Category</CardTitle>
          <CardDescription>Loading chart...</CardDescription>
        </div>
        <div className='flex'>
          <button
            data-active={true}
            className='data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6'
          >
            <span className='text-muted-foreground text-xs'>
              Total Articles
            </span>
            <span className='text-lg leading-none font-bold sm:text-3xl'>
              ...
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className='flex h-[250px] items-center justify-center px-2 pt-4 sm:px-6 sm:pt-6'>
        <div className='text-center'>
          <p className='text-muted-foreground text-sm'>Loading pie chart...</p>
        </div>
      </CardContent>
    </Card>
  )
});
