'use client';

import { Cloud, CloudAlert, LogIn, LogOut, Loader2 } from 'lucide-react';
import type { Account } from '@/lib/cloud';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useT } from '@/components/lang';

type Props = {
  account: Account | null;
  busy: boolean;
  problem: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
};

export function AccountButton({ account, busy, problem, onSignIn, onSignOut }: Props) {
  const t = useT();
  if (!account) {
    return (
      <Button variant="ghost" size="sm" onClick={onSignIn}>
        <LogIn className="size-3.5" />
        {t.signIn}
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
          <Button
            variant="ghost"
            size="sm"
            aria-label={account.email ?? t.signedIn}
            className="max-w-48"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className={problem ? 'size-3.5 text-destructive' : 'size-3.5'} />
            )}
            {/* A full email crowds the header off one row on a phone; there
                the cloud alone says signed in, and the menu says as whom. */}
            <span className="hidden truncate sm:inline">{account.email ?? t.signedIn}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="max-w-72">
        {/* Base UI only allows a menu label inside a group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            {account.email && <span className="block truncate text-foreground">{account.email}</span>}
            {problem ? (
              <span className="text-destructive">{problem}</span>
            ) : (
              <span className="text-muted-foreground">
                {t.savedToAccount}
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut}>
          <LogOut className="size-3.5" />
          {t.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
