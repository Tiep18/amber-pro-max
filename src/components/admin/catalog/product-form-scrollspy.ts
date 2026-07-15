export type SectionGeometry<SectionId extends string> = {
  id: SectionId;
  top: number;
};

type ResolveActiveSectionOptions<SectionId extends string> = {
  sections: readonly SectionGeometry<SectionId>[];
  targetOffset: number;
  activationBounds: number;
  isAtDocumentBottom?: boolean;
};

export function resolveActiveSection<SectionId extends string>({
  sections,
  targetOffset,
  activationBounds,
  isAtDocumentBottom = false
}: ResolveActiveSectionOptions<SectionId>): SectionId | null {
  if (sections.length === 0) return null;
  if (isAtDocumentBottom) return sections.at(-1)?.id ?? null;

  const activationLine = targetOffset + activationBounds;
  let activeSection = sections[0].id;

  for (const section of sections) {
    if (section.top > activationLine) break;
    activeSection = section.id;
  }

  return activeSection;
}

export type ScrollAlignment = 'start' | 'center';

type CalculateScrollTargetOptions = {
  currentScrollY: number;
  targetTop: number;
  targetHeight?: number;
  targetOffset: number;
  viewportHeight: number;
  documentHeight: number;
  alignment?: ScrollAlignment;
};

export function calculateScrollTarget({
  currentScrollY,
  targetTop,
  targetHeight = 0,
  targetOffset,
  viewportHeight,
  documentHeight,
  alignment = 'start'
}: CalculateScrollTargetOptions): number {
  const availableViewportHeight = Math.max(0, viewportHeight - targetOffset);
  const alignmentOffset =
    alignment === 'center' ? Math.max(0, (availableViewportHeight - targetHeight) / 2) : 0;
  const unclampedTarget = currentScrollY + targetTop - targetOffset - alignmentOffset;
  const maximumScrollY = Math.max(0, documentHeight - viewportHeight);

  return Math.min(maximumScrollY, Math.max(0, unclampedTarget));
}

export function easeInOutCubic(progress: number): number {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return clampedProgress < 0.5 ? 4 * clampedProgress ** 3 : 1 - (-2 * clampedProgress + 2) ** 3 / 2;
}

export function scrollDuration(distance: number): number {
  return Math.min(450, Math.max(220, Math.abs(distance) * 0.35));
}
