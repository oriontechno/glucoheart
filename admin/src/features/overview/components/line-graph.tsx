'use client';

import * as React from 'react';
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts';

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
import { TrendingUp } from 'lucide-react';

// Type definition for the data structure
interface ArticlesGrowthData {
  success: boolean;
  data: {
    success: boolean;
    time: string;
    period: string;
    from: string;
    to: string;
    total: number;
    buckets: Array<{
      start: string;
      count: number;
    }>;
  };
}

interface LineGraphProps {
  data: ArticlesGrowthData;
}

const chartConfig = {
  views: {
    label: 'Articles Published'
  },
  articles: {
    label: 'Articles',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig;

export function LineGraph({ data }: LineGraphProps) {
  // Transform the API data to chart format
  const chartData = React.useMemo(() => {
    if (!data?.data?.buckets) return [];

    return data.data.buckets.map((bucket) => ({
      date: new Date(bucket.start).toISOString().split('T')[0],
      articles: bucket.count
    }));
  }, [data]);

  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>('articles');

  const total = React.useMemo(() => {
    return data?.data?.total || 0;
  }, [data]);

  if (!data?.success || !data?.data?.success) {
    return (
      <Card className='py-4 sm:py-0'>
        <CardContent className='p-6'>
          <p className='text-muted-foreground'>Failed to load articles data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='py-4 sm:py-0'>
      <CardHeader className='flex flex-col items-stretch border-b !p-0 sm:flex-row'>
        <div className='flex flex-1 flex-col justify-center gap-1 px-6 pb-3 sm:pb-0'>
          <CardTitle>Articles Growth - Interactive</CardTitle>
          <CardDescription>
            Showing article publication count from{' '}
            {new Date(data.data.from).toLocaleDateString()} to{' '}
            {new Date(data.data.to).toLocaleDateString()}
          </CardDescription>
        </div>
        <div className='flex'>
          <button
            data-active={true}
            className='data-[active=true]:bg-muted/50 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left sm:border-t-0 sm:border-l sm:px-8 sm:py-6'
          >
            <span className='text-muted-foreground text-xs'>
              {chartConfig.articles.label}
            </span>
            <span className='text-lg leading-none font-bold sm:text-3xl'>
              {total.toLocaleString()}
            </span>
          </button>
        </div>
      </CardHeader>
      <CardContent className='px-2 pt-4 sm:px-6 sm:pt-6'>
        <ChartContainer
          config={chartConfig}
          className='mx-auto aspect-auto h-[250px] w-full'
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey='date'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  year: '2-digit'
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className='w-[150px]'
                  nameKey='views'
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  }}
                />
              }
            />
            <Line
              dataKey='articles'
              type='monotone'
              stroke='var(--color-articles)'
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className='flex-col items-start gap-2 text-sm'>
        <div className='line-clamp-1 flex gap-2 leading-none font-medium'>
          Trending up by 5.2% this month <TrendingUp className='h-4 w-4' />
        </div>
        <div className='text-muted-foreground line-clamp-1 leading-none'>
          Article publication trends over time
        </div>
      </CardFooter>
    </Card>
  );
}
