'use client';

import { Cloud, CloudAlert, LogIn, LogOut, Loader2 } from 'lucide-react';
import type { Account } from '@/lib/cloud';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = {
  account: Account | null;
  busy: boolean;
  problem: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
};

export function AccountButton({ account, busy, problem, onSignIn, onSignOut }: Props) {
  if (!account) {
    return (
      <Button variant="ghost" size="sm" onClick={onSignIn}>
        <LogIn className="size-3.5" />
        Sign in
      </Button>
    );
  }

  const Icon = problem ? CloudAlert : Cloud;

  return (
    <DropdownMenu>
      {/* Signing out sits behind a menu: a stray click on the status should
          never drop you out of your account in the middle of a draft. */}
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="sm" className="max-w-48">
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className={problem ? 'size-3.5 text-destructive' : 'size-3.5'} />
            )}
            <span className="truncate">{account.email ?? 'Signed in'}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-w-72">
        <DropdownMenuLabel className="font-normal">
          {problem ? (
            <span className="text-destructive">{problem}</span>
          ) : (
            <span className="text-muted-foreground">
              Saved to your account. Open it on your phone and the draft follows.
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="size-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
