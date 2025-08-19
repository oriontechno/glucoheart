'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content...',
  className,
  disabled = false
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          HTMLAttributes: {
            class: 'prose-bullet-list'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'prose-ordered-list'
          }
        },
        listItem: {
          HTMLAttributes: {
            class: 'prose-list-item'
          }
        }
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Write your article content here...'
      })
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4'
      }
    },
    onUpdate: ({ editor }: { editor: any }) => {
      onChange(editor.getHTML());
    },
    editable: !disabled,
    immediatelyRender: false // Fix SSR hydration mismatch
  });

  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className={cn(
          'text-muted-foreground bg-muted/10 flex min-h-[200px] items-center justify-center rounded-md border p-4',
          className
        )}
      >
        <div className='flex items-center space-x-2'>
          <div className='border-primary h-4 w-4 animate-spin rounded-full border-2 border-t-transparent'></div>
          <span>Loading editor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      {/* Toolbar */}
      <div className='bg-background border-border flex flex-wrap gap-1 border-b p-2'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 1 })
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Heading1 className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 2 })
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Heading2 className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('heading', { level: 3 })
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Heading3 className='h-4 w-4' />
        </Button>

        <div className='bg-border mx-1 h-6 w-px' />

        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bold')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Bold className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('italic')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Italic className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('strike')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Strikethrough className='h-4 w-4' />
        </Button>

        <div className='bg-border mx-1 h-6 w-px' />

        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => {
            console.log(
              'Toggling bullet list, current state:',
              editor.isActive('bulletList')
            );
            editor.chain().focus().toggleBulletList().run();
            console.log(
              'After toggle, new state:',
              editor.isActive('bulletList')
            );
          }}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('bulletList')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <List className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => {
            console.log(
              'Toggling ordered list, current state:',
              editor.isActive('orderedList')
            );
            editor.chain().focus().toggleOrderedList().run();
            console.log(
              'After toggle, new state:',
              editor.isActive('orderedList')
            );
          }}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('orderedList')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <ListOrdered className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('blockquote')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Quote className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={cn(
            'h-8 w-8 p-0',
            editor.isActive('codeBlock')
              ? 'bg-accent text-accent-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
          disabled={disabled}
        >
          <Code className='h-4 w-4' />
        </Button>

        <div className='bg-border mx-1 h-6 w-px' />

        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run() || disabled}
          className={cn(
            'h-8 w-8 p-0',
            !editor.can().chain().focus().undo().run() || disabled
              ? 'text-muted-foreground/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Undo className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run() || disabled}
          className={cn(
            'h-8 w-8 p-0',
            !editor.can().chain().focus().redo().run() || disabled
              ? 'text-muted-foreground/50'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          <Redo className='h-4 w-4' />
        </Button>
      </div>

      {/* Editor Content */}
      <div className='min-h-[200px]'>
        <EditorContent
          editor={editor}
          placeholder={placeholder}
          className='outline-none'
        />
      </div>

      <style jsx global>{`
        .ProseMirror {
          outline: none;
          min-height: 200px;
          padding: 1rem;
          color: hsl(var(--foreground));
          background-color: hsl(var(--background));
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }

        .ProseMirror h1 {
          font-size: 1.875rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }

        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }

        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.5rem;
          color: hsl(var(--foreground));
        }

        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 0.5rem 0;
          color: hsl(var(--foreground));
        }

        .ProseMirror ul {
          list-style-type: disc;
        }

        .ProseMirror ol {
          list-style-type: decimal;
        }

        .ProseMirror li {
          color: hsl(var(--foreground));
          margin: 0.25rem 0;
          display: list-item;
        }

        .ProseMirror li p {
          margin: 0;
          display: inline;
        }
        .ProseMirror blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: hsl(var(--muted-foreground));
        }

        .ProseMirror pre {
          background: hsl(var(--muted));
          border-radius: 0.375rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
          color: hsl(var(--foreground));
        }

        .ProseMirror code {
          background: hsl(var(--muted));
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          font-size: 0.875rem;
          color: hsl(var(--foreground));
        }

        .ProseMirror p {
          color: hsl(var(--foreground));
          margin: 0.5rem 0;
        }

        .ProseMirror li {
          color: hsl(var(--foreground));
        }
      `}</style>
    </div>
  );
}
