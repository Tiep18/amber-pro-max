import { describe, expect, it, vi } from 'vitest';
import { completeSuccessfulSignIn } from '@/auth/sign-in-completion';

describe('successful sign-in completion', () => {
  it('updates the persistent header before navigating', () => {
    const calls: string[] = [];
    const publishUser = vi.fn(() => calls.push('publish'));
    const replace = vi.fn(() => calls.push('replace'));
    const user = { email: 'buyer@example.com', isAdmin: false };

    completeSuccessfulSignIn(
      { status: 'success', code: 'signed_in', redirectTo: '/vi', user },
      { publishUser, replace }
    );

    expect(publishUser).toHaveBeenCalledWith(user);
    expect(replace).toHaveBeenCalledWith('/vi');
    expect(calls).toEqual(['publish', 'replace']);
  });

  it('ignores non-sign-in states', () => {
    const publishUser = vi.fn();
    const replace = vi.fn();
    completeSuccessfulSignIn({ status: 'error', code: 'auth_failed' }, { publishUser, replace });
    expect(publishUser).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
