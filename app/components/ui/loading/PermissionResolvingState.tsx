import { ShieldCheck } from 'lucide-react';
import { LoadingMessage } from './LoadingMessage';

interface PermissionResolvingStateProps {
  message: string;
  fullScreen?: boolean;
}

export function PermissionResolvingState({
  message,
  fullScreen = false,
}: PermissionResolvingStateProps) {
  return (
    <div className={`theme-app-bg flex items-center justify-center ${fullScreen ? 'h-screen' : 'py-16'}`}>
      <div className="theme-card max-w-md rounded-lg p-6">
        <LoadingMessage
          title={message}
          description="Scholaroscope is resolving your session, workspace, and access policy before opening this area."
        />
        <ShieldCheck className="mt-4 h-5 w-5 theme-subtle" aria-hidden="true" />
      </div>
    </div>
  );
}
