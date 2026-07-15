import { describe, expect, it } from 'vitest';
import {
  calculateScrollTarget,
  resolveActiveSection
} from '@/components/admin/catalog/product-form-scrollspy';

const sections = [
  { id: 'basics', top: 121 },
  { id: 'content', top: 520 },
  { id: 'pricing', top: 940 },
  { id: 'publish', top: 1360 }
] as const;

describe('resolveActiveSection', () => {
  it('falls back to the first section before any section crosses the activation line', () => {
    expect(resolveActiveSection({ sections, targetOffset: 100, activationBounds: 20 })).toBe(
      'basics'
    );
  });

  it('activates a section exactly on and immediately across the activation line', () => {
    expect(
      resolveActiveSection({
        sections: [
          { id: 'basics', top: -100 },
          { id: 'content', top: 120 }
        ],
        targetOffset: 100,
        activationBounds: 20
      })
    ).toBe('content');
    expect(
      resolveActiveSection({
        sections: [
          { id: 'basics', top: -100 },
          { id: 'content', top: 120.01 }
        ],
        targetOffset: 100,
        activationBounds: 20
      })
    ).toBe('basics');
  });

  it('selects the last ordered section above the activation line', () => {
    expect(
      resolveActiveSection({
        sections: sections.map((section) => ({ ...section, top: section.top - 900 })),
        targetOffset: 100,
        activationBounds: 20
      })
    ).toBe('pricing');
  });

  it('resolves upward traversal from the current geometry instead of previous state', () => {
    const downward = sections.map((section) => ({ ...section, top: section.top - 850 }));
    const upward = sections.map((section) => ({ ...section, top: section.top - 350 }));

    expect(
      resolveActiveSection({ sections: downward, targetOffset: 100, activationBounds: 20 })
    ).toBe('pricing');
    expect(
      resolveActiveSection({ sections: upward, targetOffset: 100, activationBounds: 20 })
    ).toBe('basics');
  });

  it('uses the current responsive target offset', () => {
    const responsiveSections = [
      { id: 'basics', top: -50 },
      { id: 'content', top: 145 }
    ] as const;

    expect(
      resolveActiveSection({
        sections: responsiveSections,
        targetOffset: 100,
        activationBounds: 8
      })
    ).toBe('basics');
    expect(
      resolveActiveSection({
        sections: responsiveSections,
        targetOffset: 140,
        activationBounds: 8
      })
    ).toBe('content');
  });

  it('forces the final section at the document bottom', () => {
    expect(
      resolveActiveSection({
        sections,
        targetOffset: 100,
        activationBounds: 20,
        isAtDocumentBottom: true
      })
    ).toBe('publish');
  });
});

describe('calculateScrollTarget', () => {
  const baseOptions = {
    currentScrollY: 300,
    targetTop: 500,
    targetOffset: 120,
    viewportHeight: 800,
    documentHeight: 2400
  };

  it('subtracts targetOffset exactly once for start alignment', () => {
    expect(calculateScrollTarget(baseOptions)).toBe(680);
  });

  it('is independent from activation bounds because the destination API does not accept it', () => {
    const targetWithDesktopActivationBounds = calculateScrollTarget(baseOptions);
    const targetWithMobileActivationBounds = calculateScrollTarget({ ...baseOptions });

    expect(targetWithDesktopActivationBounds).toBe(targetWithMobileActivationBounds);
  });

  it('centers a target inside the viewport below the occupied sticky edge', () => {
    expect(
      calculateScrollTarget({
        ...baseOptions,
        targetHeight: 40,
        alignment: 'center'
      })
    ).toBe(360);
  });

  it('clamps targets to the valid document scroll range', () => {
    expect(calculateScrollTarget({ ...baseOptions, currentScrollY: 0, targetTop: 40 })).toBe(0);
    expect(calculateScrollTarget({ ...baseOptions, targetTop: 5000 })).toBe(1600);
  });
});
