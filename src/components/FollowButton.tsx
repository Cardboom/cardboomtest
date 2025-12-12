import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFollows } from '@/hooks/useFollows';

interface FollowButtonProps {
  userId: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showCount?: boolean;
}

export const FollowButton = ({
  userId,
  variant = 'outline',
  size = 'default',
  showCount = false,
}: FollowButtonProps) => {
  const { isFollowing, followersCount, loading, toggleFollow } = useFollows(userId);

  if (loading) {
    return (
      <Button variant={variant} size={size} disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'secondary' : variant}
      size={size}
      onClick={toggleFollow}
      className={isFollowing ? 'hover:bg-destructive hover:text-destructive-foreground' : ''}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Following
          {showCount && followersCount > 0 && (
            <span className="ml-1 text-xs">({followersCount})</span>
          )}
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
          {showCount && followersCount > 0 && (
            <span className="ml-1 text-xs">({followersCount})</span>
          )}
        </>
      )}
    </Button>
  );
};
