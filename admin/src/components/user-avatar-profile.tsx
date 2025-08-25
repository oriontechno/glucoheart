import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  IconShield,
  IconStethoscope,
  IconUser,
  IconCrown
} from '@tabler/icons-react';

interface UserAvatarProfileProps {
  className?: string;
  showInfo?: boolean;
  user: {
    imageUrl?: string;
    fullName?: string | null;
    emailAddresses: Array<{ emailAddress: string }>;
    role?: string;
  } | null;
}

export function UserAvatarProfile({
  className,
  showInfo = false,
  user
}: UserAvatarProfileProps) {
  // Helper function to get role styling
  const getRoleConfig = (role: string) => {
    const roleConfigs = {
      superadmin: {
        label: 'Super Admin',
        icon: IconCrown,
        className: 'bg-destructive text-destructive-foreground border-0'
      },
      admin: {
        label: 'Admin',
        icon: IconShield,
        className: 'bg-primary text-primary-foreground border-0'
      },
      nurse: {
        label: 'Nurse',
        icon: IconStethoscope,
        className: 'bg-chart-2 text-primary-foreground border-0'
      },
      user: {
        label: 'User',
        icon: IconUser,
        className: 'bg-muted text-muted-foreground border-0'
      }
    };
    return (
      roleConfigs[role.toLowerCase() as keyof typeof roleConfigs] ||
      roleConfigs.user
    );
  };

  return (
    <div className='flex items-center gap-2'>
      <Avatar className={className}>
        <AvatarImage src={user?.imageUrl || ''} alt={user?.fullName || ''} />
        <AvatarFallback className='rounded-lg'>
          {user?.fullName?.slice(0, 2)?.toUpperCase() || 'CN'}
        </AvatarFallback>
      </Avatar>

      {showInfo && (
        <div className='grid flex-1 text-left text-sm leading-tight'>
          <div className='flex items-center gap-2'>
            <span className='max-w-[120px] truncate font-semibold'>
              {user?.fullName || ''}
            </span>
            {user?.role &&
              (() => {
                const roleConfig = getRoleConfig(user.role);
                const RoleIcon = roleConfig.icon;
                return (
                  <Badge
                    className={`${roleConfig.className} flex h-5 items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium shadow-sm`}
                  >
                    <RoleIcon className='h-2.5 w-2.5' />
                    {roleConfig.label}
                  </Badge>
                );
              })()}
          </div>
          <span className='truncate text-xs'>
            {user?.emailAddresses[0].emailAddress || ''}
          </span>
        </div>
      )}
    </div>
  );
}
