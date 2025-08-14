import { notFound } from 'next/navigation';
import UsersForm from './users-form';
import { usersService } from '@/lib/api';

type TUserViewPageProps = {
  userId: string;
};

export default async function UsersViewPage({ userId }: TUserViewPageProps) {
  let user = null;
  let pageTitle = 'Create New User';

  if (userId !== 'new') {
    try {
      const data = await usersService.getUserById(userId);

      if (data.success && data.user) {
        user = data.user;
        pageTitle = `Edit User`;
      } else {
        notFound();
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      notFound();
    }
  }

  return <UsersForm initialData={user} pageTitle={pageTitle} />;
}
