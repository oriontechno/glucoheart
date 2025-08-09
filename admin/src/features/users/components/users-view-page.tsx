import { fakeProducts, Product } from '@/constants/mock-api';
import { notFound } from 'next/navigation';
import ProductForm from './users-form';

type TUserViewPageProps = {
  userId: string;
};

export default async function UsersViewPage({
  userId
}: TUserViewPageProps) {
  let product = null;
  let pageTitle = 'Create New User';

  if (userId !== 'new') {
    const data = await fakeProducts.getProductById(Number(userId));
    product = data.product as Product;
    if (!product) {
      notFound();
    }
    pageTitle = `Edit User`;
  }

  return <ProductForm initialData={product} pageTitle={pageTitle} />;
}
