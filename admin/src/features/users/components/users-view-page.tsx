import { fakeUsers, User } from '@/constants/mock-api';
import { notFound } from 'next/navigation';
import UsersForm from './users-form';

type TUserViewPageProps = {
  userId: string;
};

export default async function UsersViewPage({
  userId
}: TUserViewPageProps) {
  let user = null;
  let pageTitle = 'Create New User';

  if (userId !== 'new') {
    try {
      const data = await fakeUsers.getUserById(userId);
      
      if (data.success && data.user) {
        user = data.user as User;
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
