import { Product } from '@/constants/data';
import { fakeProducts, fakeUsers, User } from '@/constants/mock-api';
import { searchParamsCache } from '@/lib/searchparams';
import { ProductTable } from './users-tables';
import { columns } from './users-tables/columns';

type UsersListingPage = {};

export default async function UsersListingPage({}: UsersListingPage) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const categories = searchParamsCache.get('category');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(categories && { categories: categories })
  };

  const data = await fakeUsers.getUsers(filters);
  const totalUsers = data.total_users;
  const users: User[] = data.users;

  return (
    <ProductTable
      data={users}
      totalItems={totalUsers}
      columns={columns}
    />
  );
}
