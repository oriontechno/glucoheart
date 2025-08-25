import {
  createSearchParamsCache,
  createSerializer,
  parseAsInteger,
  parseAsString
} from 'nuqs/server';

export const searchParams = {
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),

  // Product search fields
  name: parseAsString,

  // User search fields
  search: parseAsString, // General search parameter for all columns
  firstName: parseAsString,
  email: parseAsString,
  role: parseAsString,
  active: parseAsString,
  // Article search fields
  title: parseAsString,
  // Common fields
  gender: parseAsString,
  category: parseAsString,
  categories: parseAsString,
  sort: parseAsString
  // advanced filter
  // filters: getFiltersStateParser().withDefault([]),
  // joinOperator: parseAsStringEnum(['and', 'or']).withDefault('and')
};

export const searchParamsCache = createSearchParamsCache(searchParams);
export const serialize = createSerializer(searchParams);
