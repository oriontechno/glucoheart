import { searchParamsCache } from '@/lib/searchparams';
import { columns } from './users-tables/columns';
import { UsersTable } from './users-tables';
import { UsersServerService } from '@/lib/api/users.server.service';
import { redirect } from 'next/navigation';
import { User } from '@/types/entity';

type UsersListingPage = {};

export default async function UsersListingPage({}: UsersListingPage) {
  // Showcasing the use of search params cache in nested RSCs
  const page = searchParamsCache.get('page');
  const search = searchParamsCache.get('search');
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

  // Use server service to fetch users
  const result = await UsersServerService.getUsers(filters);

  if (!result.success) {
    // Handle authentication error
    if (result.error === 'Not authenticated') {
      redirect('/auth/sign-in');
    }
  }

  const totalUsers = result.data.total_users || 0;
  const users: User[] = result.data.users || [];

  return <UsersTable data={users} totalItems={totalUsers} columns={columns} />;
}
