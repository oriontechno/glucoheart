import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './users-tables/columns';
import { UsersTable } from './users-tables';
import { fakeUsers, User } from '@/constants/mock-api';

type UsersListingPage = {};

export default async function UsersListingPage({}: UsersListingPage) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('name');
  const pageLimit = searchParamsCache.get('perPage');
  const roles = searchParamsCache.get('role');
  const actives = searchParamsCache.get('active');
  const sort = searchParamsCache.get('sort');

  const filters = {
    page,
    limit: pageLimit,
    ...(search && { search }),
    ...(roles && { roles: roles }),
    ...(actives && { actives: actives }),
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
