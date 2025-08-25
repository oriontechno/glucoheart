import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModeToggle } from '@/components/layout/ThemeToggle/theme-toggle';
import { GitHubLogoIcon } from '@radix-ui/react-icons';
import { IconStar } from '@tabler/icons-react';
import { Metadata } from 'next';
import Link from 'next/link';
import UserAuthForm from './user-auth-form';

export const metadata: Metadata = {
  title: 'Authentication',
  description: 'Authentication forms built using the components.'
};

export default function SignInViewPage() {
  return (
    <div className='bg-background relative h-screen flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0'>
      <div className='absolute top-4 right-4 flex items-center space-x-2 md:top-8 md:right-8'>
        <ModeToggle />
        <Link
          href='/dashboard'
          className={cn(buttonVariants({ variant: 'ghost' }), 'hidden')}
        >
          Dashboard
        </Link>
      </div>
      <div className='bg-muted text-foreground relative hidden h-full flex-col border-r p-10 lg:flex'>
        <div className='from-primary/10 to-primary/5 absolute inset-0 bg-gradient-to-br' />
        <div className='text-primary relative z-20 flex items-center text-lg font-medium'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            className='mr-2 h-6 w-6'
          >
            <path d='M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3' />
          </svg>
          Glucoheart Dashboard
        </div>
        <div className='relative z-20 mt-auto'>
          <blockquote className='space-y-2'>
            <p className='text-lg'>
              &ldquo;Glucoheart membantu saya memantau kesehatan dengan lebih
              baik dan mendapatkan konsultasi yang tepat dari para ahli.&rdquo;
            </p>
            <footer className='text-muted-foreground text-sm'>
              Healthcare Professional
            </footer>
          </blockquote>
        </div>
      </div>
      <div className='bg-background flex h-full items-center justify-center p-4 lg:p-8'>
        <div className='flex w-full max-w-md flex-col items-center justify-center space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Sign in to Glucoheart Dashboard
            </h1>
            <p className='text-muted-foreground text-sm'>
              Welcome back! Please sign in to continue
            </p>
          </div>

          <UserAuthForm />

          <p className='text-muted-foreground px-8 text-center text-sm'>
            By clicking sign in, you agree to our{' '}
            <Link
              href='/terms'
              className='hover:text-primary underline underline-offset-4'
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              href='/privacy'
              className='hover:text-primary underline underline-offset-4'
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
