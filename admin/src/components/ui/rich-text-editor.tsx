'use client';

import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
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
  Heading3,
  ImageIcon,
  Link,
  Upload
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
  // Hidden file input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Handle image upload
  const handleImageUpload = () => {
    fileInputRef.current?.click();
  };

  // Handle image URL insertion
  const handleImageUrl = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      // Validate URL format
      try {
        new URL(url);
      } catch {
        toast.error('Invalid URL', {
          description: 'Please enter a valid image URL'
        });
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading('Loading image...', {
        description: 'Checking if the image is accessible'
      });

      // Test if image loads
      const img = document.createElement('img');
      img.onload = () => {
        editor?.chain().focus().setImage({ src: url, alt: 'Image' }).run();
        toast.dismiss(loadingToast);
        toast.success('Image inserted successfully', {
          description: 'Image loaded from URL'
        });
      };

      img.onerror = () => {
        toast.dismiss(loadingToast);
        toast.error('Failed to load image', {
          description: 'The image URL is not accessible or invalid'
        });
      };

      img.src = url;
    }
  };

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file type', {
        description: 'Please select an image file (JPG, PNG, GIF, WebP)'
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', {
        description: 'File size should be less than 5MB'
      });
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading('Uploading image...', {
      description: 'Please wait while we process your image'
    });

    // Convert to base64 for preview (in production, you'd upload to server)
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;

      // Insert image into editor
      editor?.chain().focus().setImage({ src, alt: file.name }).run();

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Image uploaded successfully', {
        description: `${file.name} (${(file.size / 1024).toFixed(2)} KB)`
      });
    };

    reader.onerror = () => {
      toast.dismiss(loadingToast);
      toast.error('Upload failed', {
        description: 'Failed to read the image file'
      });
    };

    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  };

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
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'prose-image'
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
            const wasActive = editor.isActive('bulletList');
            editor.chain().focus().toggleBulletList().run();
            const isActive = editor.isActive('bulletList');

            if (isActive && !wasActive) {
              toast.success('Bullet list activated');
            } else if (!isActive && wasActive) {
              toast.success('Bullet list deactivated');
            }
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
            const wasActive = editor.isActive('orderedList');
            editor.chain().focus().toggleOrderedList().run();
            const isActive = editor.isActive('orderedList');

            if (isActive && !wasActive) {
              toast.success('Numbered list activated');
            } else if (!isActive && wasActive) {
              toast.success('Numbered list deactivated');
            }
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className={cn(
                'h-8 w-8 p-0',
                'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
              disabled={disabled}
              title='Insert Image'
            >
              <ImageIcon className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='start'>
            <DropdownMenuItem
              onClick={handleImageUpload}
              className='cursor-pointer'
            >
              <Upload className='mr-2 h-4 w-4' />
              Upload Image
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleImageUrl}
              className='cursor-pointer'
            >
              <Link className='mr-2 h-4 w-4' />
              Insert URL
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

      {/* Hidden file input for image upload */}
      <input
        type='file'
        ref={fileInputRef}
        onChange={handleFileChange}
        accept='image/*'
        className='hidden'
        multiple={false}
      />

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

        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          margin: 1rem 0;
          box-shadow:
            0 1px 3px 0 rgb(0 0 0 / 0.1),
            0 1px 2px -1px rgb(0 0 0 / 0.1);
          cursor: pointer;
          transition: transform 0.2s ease-in-out;
        }

        .ProseMirror img:hover {
          transform: scale(1.02);
        }

        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid hsl(var(--primary));
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
