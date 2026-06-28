import type { AuthActionState, AuthenticatedHeaderUser } from './actions';

type SignInCompletionDependencies = {
  publishUser: (user: AuthenticatedHeaderUser) => void;
  replace: (path: string) => void;
};

export function completeSuccessfulSignIn(
  state: AuthActionState,
  { publishUser, replace }: SignInCompletionDependencies
) {
  if (
    state.status !== 'success' ||
    state.code !== 'signed_in' ||
    !state.user ||
    !state.redirectTo
  ) {
    return;
  }

  publishUser(state.user);
  replace(state.redirectTo);
}
