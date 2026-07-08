import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {PolicyDraftInput} from '@/policies/schemas';

const {
  createSupabaseServerClientMock,
  invalidatePolicyCacheMock,
  recordOperationalFailureMock,
  requireAdminMock
} = vi.hoisted(() => ({
  createSupabaseServerClientMock: vi.fn(),
  invalidatePolicyCacheMock: vi.fn(),
  recordOperationalFailureMock: vi.fn(async () => ({status: 'recorded', errorId: '76000000-0000-4000-8000-000000000001'})),
  requireAdminMock: vi.fn()
}));

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));
vi.mock('@/auth/guards', () => ({requireAdmin: requireAdminMock}));
vi.mock('@/lib/cache-invalidation', () => ({invalidatePolicyCache: invalidatePolicyCacheMock}));
vi.mock('@/lib/supabase/server', () => ({createSupabaseServerClient: createSupabaseServerClientMock}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));

import {publishPolicyAction, savePolicyDraftAction, unpublishPolicyAction} from '@/policies/actions';

const policyId = '44444444-4444-4444-8444-444444444444';

function validDraft(): PolicyDraftInput {
  return {
    policyKind: 'privacy',
    translations: {
      vi: {
        slug: 'chinh-sach-bao-mat',
        title: 'Chinh sach bao mat',
        summary: 'Tom tat chinh sach bao mat.',
        body: 'Noi dung bao mat khong duoc log.',
        seoTitle: 'Chinh sach bao mat',
        seoDescription: 'Mo ta SEO khong duoc log.',
        socialImageBucket: 'policy-media',
        socialImagePath: 'policy/privacy-vi.jpg'
      },
      en: {
        slug: 'privacy-policy',
        title: 'Privacy policy',
        summary: 'Privacy policy summary.',
        body: 'Sensitive policy body must not be logged.',
        seoTitle: 'Privacy policy',
        seoDescription: 'Sensitive SEO copy must not be logged.',
        socialImageBucket: 'policy-media',
        socialImagePath: 'policy/privacy-en.jpg'
      }
    }
  };
}

describe('policy admin action operational recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminMock.mockResolvedValue({id: '11111111-1111-4111-8111-111111111111'});
  });

  it('records policy page save failures without exposing policy content', async () => {
    const single = vi.fn(async () => ({data: null, error: {message: 'relation private.policy_secret does not exist'}}));
    const select = vi.fn(() => ({single}));
    const insert = vi.fn(() => ({select}));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({insert}))
    });

    await expect(savePolicyDraftAction(validDraft())).resolves.toEqual({
      status: 'error',
      code: 'policy_save_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'policy_save_failed',
        summary: 'Policy page save failed',
        facts: expect.objectContaining({
          action: 'policy_save',
          code: 'policy_save_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/policy_secret|relation|Sensitive policy|Noi dung|SEO|privacy-en|email|token/i);
  });

  it('records publish issue lookup failures without exposing raw issue details', async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({data: [{published: false}], error: null})
      .mockResolvedValueOnce({data: null, error: {message: 'raw policy issue lookup detail'}});
    createSupabaseServerClientMock.mockResolvedValue({rpc});

    await expect(publishPolicyAction(policyId)).resolves.toEqual({
      status: 'error',
      code: 'policy_publish_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'policy_publish_failed',
        summary: 'Policy publish issue lookup failed',
        facts: expect.objectContaining({
          action: 'policy_publish_issues',
          referenceId: policyId,
          code: 'policy_publish_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/raw policy issue|body|SEO|email|token/i);
  });

  it('records unpublish failures with only the policy reference', async () => {
    const eq = vi.fn(async () => ({error: {message: 'private unpublish constraint detail'}}));
    const update = vi.fn(() => ({eq}));
    createSupabaseServerClientMock.mockResolvedValue({
      from: vi.fn(() => ({update}))
    });

    await expect(unpublishPolicyAction(policyId)).resolves.toEqual({
      status: 'error',
      code: 'policy_unpublish_failed'
    });

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'policy_unpublish_failed',
        summary: 'Policy unpublish failed',
        facts: expect.objectContaining({
          action: 'policy_unpublish',
          referenceId: policyId,
          code: 'policy_unpublish_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(/private unpublish|constraint|email|token/i);
  });
});
