export type User = {
  id: string; // UUID (PK)
  firstName: string;
  lastName: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'NURSE' | 'SUPPORT';
  created_at: string;
};

export type ArticleCategory = {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
};

export type Article = {
  id: number;
  title: string;
  slug: string;
  status: 'published' | 'draft'; // bisa pakai union biar ketat
  summary?: string;
  categories?: ArticleCategory[]; // Support both backend format (string) and frontend format (array)
  content: string;
  coverImageAlt?: string;
  coverImageUrl?: string;
  cover?: File; // Optional for existing articles
};
