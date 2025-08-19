'use client';

import { useState } from 'react';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestRichTextEditor() {
  const [content, setContent] = useState(`
    <h1>Welcome to Rich Text Editor</h1>
    <p>This is a <strong>bold</strong> text and this is <em>italic</em> text.</p>
    <ul>
      <li>Feature 1: Rich formatting</li>
      <li>Feature 2: Lists and headers</li>
      <li>Feature 3: Links and images</li>
    </ul>
    <blockquote>This is a blockquote example</blockquote>
  `);

  const handleSubmit = () => {
    console.log('Content HTML:', content);
    console.log('Content Length:', content.length);
    alert('Content saved! Check console for details.');
  };

  return (
    <div className='container mx-auto max-w-4xl py-8'>
      <Card>
        <CardHeader>
          <CardTitle>Rich Text Editor Test</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div>
            <label className='text-sm font-medium'>Article Content</label>
            <div className='mt-2'>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder='Start writing your article...'
                className='w-full'
              />
            </div>
          </div>

          <Button onClick={handleSubmit} className='w-full'>
            Save Content
          </Button>

          <div className='mt-6 rounded-lg bg-gray-50 p-4'>
            <h3 className='mb-2 font-medium'>Preview HTML Output:</h3>
            <pre className='overflow-x-auto rounded border bg-white p-2 text-xs'>
              {content}
            </pre>
          </div>

          <div className='mt-4 rounded-lg border p-4'>
            <h3 className='mb-2 font-medium'>Rendered Preview:</h3>
            <div
              className='prose prose-sm max-w-none'
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
