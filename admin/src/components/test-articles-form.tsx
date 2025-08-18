import ArticlesForm from '@/features/articles/components/articles-form';

// Test component for articles form with multiple categories
export default function TestArticlesForm() {
  const mockArticle = {
    id: 1,
    title: 'Sample Article',
    summary: 'This is a sample article summary',
    content: 'This is the content of the sample article',
    status: 'draft' as const,
    categories: 'health.nutrition', // Backend format: dot-separated string
    coverUrl: 'https://example.com/cover.jpg',
    coverAlt: 'Sample cover',
    slug: 'sample-article'
  };

  return (
    <div className='container mx-auto py-8'>
      <h1 className='mb-8 text-2xl font-bold'>Test Articles Form</h1>

      {/* Test with existing data */}
      <div className='mb-8'>
        <h2 className='mb-4 text-lg font-semibold'>
          Edit Mode (with existing categories)
        </h2>
        <ArticlesForm initialData={mockArticle} pageTitle='Edit Article' />
      </div>

      {/* Test without existing data */}
      <div className='mb-8'>
        <h2 className='mb-4 text-lg font-semibold'>Create Mode (empty form)</h2>
        <ArticlesForm initialData={null} pageTitle='Create Article' />
      </div>
    </div>
  );
}
