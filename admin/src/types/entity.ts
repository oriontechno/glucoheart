export type User = {
  id: string; // UUID (PK)
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'NURSE' | 'SUPPORT';
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  status: 'published' | 'draft' | 'archived'; // bisa pakai union biar ketat
  summary: string;
  coverImageId: number;
  created_at: string; // kalau mau bisa ubah ke Date
  updated_at: string;
  published_at: string;
  categories: Category[];
};
