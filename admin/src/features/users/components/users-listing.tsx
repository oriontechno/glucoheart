import { fakeUsers, User } from '@/constants/mock-api';
import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './users-tables/columns';
import { UsersTable } from './users-tables';

type UsersListingPage = {};

export default async function UsersListingPage({}: UsersListingPage) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const categories = searchParamsCache.get('category');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(categories && { categories: categories }),
    ...(sort && { sort })
  };

  const data = await fakeUsers.getUsers(filters);
  const totalUsers = data.total_users;
  const users: User[] = data.users;

  return (
    <UsersTable
      data={users}
      totalItems={totalUsers}
      columns={columns}
    />
  );
}
