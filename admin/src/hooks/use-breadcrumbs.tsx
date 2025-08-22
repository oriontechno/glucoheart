'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// Function to convert path segments to readable titles
const formatSegmentTitle = (segment: string): string => {
  return segment
    .split('-') // Split by dashes
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(' '); // Join with spaces
};

// This allows to add custom title as well for specific routes that need special handling
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: 'Dashboard', link: '/dashboard' }]
  // Add specific custom mappings only when the dynamic formatting isn't enough
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: formatSegmentTitle(segment),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
