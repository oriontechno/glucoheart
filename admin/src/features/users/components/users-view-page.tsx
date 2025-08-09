import { fakeProducts, fakeUsers, Product, User } from '@/constants/mock-api';
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
    const data = await fakeUsers.getUserById(userId);
    user = data.user as User;
    if (!user) {
      notFound();
    }
    pageTitle = `Edit User`;
  }

  return <UsersForm initialData={user} pageTitle={pageTitle} />;
}
