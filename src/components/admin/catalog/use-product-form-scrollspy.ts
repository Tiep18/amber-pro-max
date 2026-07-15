'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  calculateScrollTarget,
  easeInOutCubic,
  resolveActiveSection,
  scrollDuration,
  type ScrollAlignment
} from '@/components/admin/catalog/product-form-scrollspy';

export type ScrollspyState = 'idle' | 'animating';

type NavigationCallbacks = {
  onComplete?: () => void;
  onCancel?: () => void;
};

type ElementNavigationOptions<SectionId extends string> = NavigationCallbacks & {
  element: HTMLElement;
  activeSection?: SectionId;
  alignment?: ScrollAlignment;
};

type UseProductFormScrollspyOptions<SectionId extends string> = {
  sectionIds: readonly SectionId[];
  mobileNavigatorRef: RefObject<HTMLElement | null>;
  activationBounds?: number;
  visualGap?: number;
};

type ActiveNavigation = NavigationCallbacks & {
  frame: number;
  token: number;
};

const scrollKeys = new Set(['ArrowDown', 'ArrowUp', 'End', 'Home', 'PageDown', 'PageUp', ' ']);

export function useProductFormScrollspy<SectionId extends string>({
  sectionIds,
  mobileNavigatorRef,
  activationBounds = 8,
  visualGap = 8
}: UseProductFormScrollspyOptions<SectionId>) {
  const firstSection = sectionIds[0];
  if (!firstSection) {
    throw new Error('useProductFormScrollspy requires at least one section.');
  }

  const [activeSection, setActiveSection] = useState<SectionId>(firstSection);
  const [scrollspyState, setScrollspyState] = useState<ScrollspyState>('idle');
  const [targetOffset, setTargetOffset] = useState(0);
  const activeSectionRef = useRef(activeSection);
  const targetOffsetRef = useRef(targetOffset);
  const targetElementsRef = useRef(new Map<SectionId, HTMLElement>());
  const resolveFrameRef = useRef<number | null>(null);
  const navigationRef = useRef<ActiveNavigation | null>(null);
  const navigationTokenRef = useRef(0);
  const reducedMotionRef = useRef(false);
  const forcedScrollBehaviorRef = useRef<{ previous: string } | null>(null);

  const updateActiveSection = useCallback((section: SectionId) => {
    if (activeSectionRef.current === section) return;
    activeSectionRef.current = section;
    setActiveSection(section);
  }, []);

  const restoreScrollBehavior = useCallback(() => {
    const forcedBehavior = forcedScrollBehaviorRef.current;
    if (!forcedBehavior) return;
    document.documentElement.style.scrollBehavior = forcedBehavior.previous;
    forcedScrollBehaviorRef.current = null;
  }, []);

  const forceInstantScrollBehavior = useCallback(() => {
    if (forcedScrollBehaviorRef.current) return;
    forcedScrollBehaviorRef.current = {
      previous: document.documentElement.style.scrollBehavior
    };
    document.documentElement.style.scrollBehavior = 'auto';
  }, []);

  const resolveCurrentSection = useCallback(() => {
    if (navigationRef.current) return;

    const sections = sectionIds.flatMap((id) => {
      const element = targetElementsRef.current.get(id);
      return element ? [{ id, top: element.getBoundingClientRect().top }] : [];
    });
    const documentElement = document.documentElement;
    const resolvedSection = resolveActiveSection({
      sections,
      targetOffset: targetOffsetRef.current,
      activationBounds,
      isAtDocumentBottom: window.scrollY + window.innerHeight >= documentElement.scrollHeight - 1
    });

    if (resolvedSection) updateActiveSection(resolvedSection);
  }, [activationBounds, sectionIds, updateActiveSection]);

  const scheduleResolve = useCallback(() => {
    if (resolveFrameRef.current !== null) return;
    resolveFrameRef.current = window.requestAnimationFrame(() => {
      resolveFrameRef.current = null;
      resolveCurrentSection();
    });
  }, [resolveCurrentSection]);

  const cancelCurrentNavigation = useCallback(
    (shouldResolve = true) => {
      const navigation = navigationRef.current;
      if (!navigation) {
        if (shouldResolve) scheduleResolve();
        return;
      }

      navigationTokenRef.current += 1;
      window.cancelAnimationFrame(navigation.frame);
      navigationRef.current = null;
      restoreScrollBehavior();
      setScrollspyState('idle');
      navigation.onCancel?.();
      if (shouldResolve) scheduleResolve();
    },
    [restoreScrollBehavior, scheduleResolve]
  );

  const navigateToElement = useCallback(
    ({
      element,
      activeSection: requestedSection,
      alignment = 'start',
      onComplete,
      onCancel
    }: ElementNavigationOptions<SectionId>) => {
      cancelCurrentNavigation(false);
      const token = navigationTokenRef.current + 1;
      navigationTokenRef.current = token;
      if (requestedSection) updateActiveSection(requestedSection);

      const elementBounds = element.getBoundingClientRect();
      const startScrollY = window.scrollY;
      const destination = calculateScrollTarget({
        currentScrollY: startScrollY,
        targetTop: elementBounds.top,
        targetHeight: elementBounds.height,
        targetOffset: targetOffsetRef.current,
        viewportHeight: window.innerHeight,
        documentHeight: document.documentElement.scrollHeight,
        alignment
      });
      const distance = destination - startScrollY;

      forceInstantScrollBehavior();
      if (reducedMotionRef.current || Math.abs(distance) < 1) {
        window.scrollTo({ top: destination, behavior: 'auto' });
        restoreScrollBehavior();
        setScrollspyState('idle');
        resolveCurrentSection();
        onComplete?.();
        return token;
      }

      const duration = scrollDuration(distance);
      let startedAt: number | null = null;
      setScrollspyState('animating');

      const step = (timestamp: number) => {
        const navigation = navigationRef.current;
        if (!navigation || navigation.token !== token || navigationTokenRef.current !== token) {
          return;
        }
        startedAt ??= timestamp;
        const progress = Math.min(1, (timestamp - startedAt) / duration);
        window.scrollTo({
          top: startScrollY + distance * easeInOutCubic(progress),
          behavior: 'auto'
        });

        if (progress < 1) {
          navigation.frame = window.requestAnimationFrame(step);
          return;
        }

        navigationRef.current = null;
        restoreScrollBehavior();
        setScrollspyState('idle');
        resolveCurrentSection();
        onComplete?.();
      };

      const frame = window.requestAnimationFrame(step);
      navigationRef.current = { frame, token, onComplete, onCancel };
      return token;
    },
    [
      cancelCurrentNavigation,
      forceInstantScrollBehavior,
      resolveCurrentSection,
      restoreScrollBehavior,
      updateActiveSection
    ]
  );

  const navigateToSection = useCallback(
    (section: SectionId, callbacks: NavigationCallbacks = {}) => {
      const element = targetElementsRef.current.get(section) ?? document.getElementById(section);
      if (!element) return null;
      targetElementsRef.current.set(section, element);
      return navigateToElement({
        element,
        activeSection: section,
        alignment: 'start',
        ...callbacks
      });
    },
    [navigateToElement]
  );

  useLayoutEffect(() => {
    targetElementsRef.current = new Map(
      sectionIds.flatMap((id) => {
        const element = document.getElementById(id);
        return element ? [[id, element] as const] : [];
      })
    );
    scheduleResolve();
  }, [scheduleResolve, sectionIds]);

  useLayoutEffect(() => {
    const adminHeader = document.querySelector<HTMLElement>('[data-admin-sticky-header]');
    const getVisibleOccupiedEdge = (element: HTMLElement | null) => {
      if (!element) return 0;
      const styles = window.getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      if (
        styles.display === 'none' ||
        styles.visibility === 'hidden' ||
        bounds.height === 0 ||
        bounds.width === 0
      ) {
        return 0;
      }
      const stickyTop = Number.parseFloat(styles.top);
      return Math.max(0, Number.isFinite(stickyTop) ? stickyTop : bounds.top) + bounds.height;
    };
    const measureTargetOffset = () => {
      const occupiedEdge = Math.max(
        getVisibleOccupiedEdge(adminHeader),
        getVisibleOccupiedEdge(mobileNavigatorRef.current)
      );
      const nextOffset = Math.round((occupiedEdge + visualGap) * 100) / 100;
      targetOffsetRef.current = nextOffset;
      setTargetOffset((current) => (current === nextOffset ? current : nextOffset));
      scheduleResolve();
    };

    measureTargetOffset();
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => measureTargetOffset());
    if (adminHeader) resizeObserver?.observe(adminHeader);
    if (mobileNavigatorRef.current) resizeObserver?.observe(mobileNavigatorRef.current);
    for (const element of targetElementsRef.current.values()) {
      resizeObserver?.observe(element);
    }
    window.addEventListener('resize', measureTargetOffset, { passive: true });

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', measureTargetOffset);
    };
  }, [mobileNavigatorRef, scheduleResolve, visualGap]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => {
      reducedMotionRef.current = mediaQuery.matches;
    };
    updateReducedMotion();
    mediaQuery.addEventListener('change', updateReducedMotion);
    return () => mediaQuery.removeEventListener('change', updateReducedMotion);
  }, []);

  useEffect(() => {
    const interruptNavigation = () => cancelCurrentNavigation();
    const interruptWithScrollKey = (event: KeyboardEvent) => {
      if (scrollKeys.has(event.key)) interruptNavigation();
    };

    window.addEventListener('scroll', scheduleResolve, { passive: true });
    window.addEventListener('wheel', interruptNavigation, { passive: true });
    window.addEventListener('touchstart', interruptNavigation, { passive: true });
    window.addEventListener('pointerdown', interruptNavigation, { passive: true });
    window.addEventListener('keydown', interruptWithScrollKey);

    return () => {
      window.removeEventListener('scroll', scheduleResolve);
      window.removeEventListener('wheel', interruptNavigation);
      window.removeEventListener('touchstart', interruptNavigation);
      window.removeEventListener('pointerdown', interruptNavigation);
      window.removeEventListener('keydown', interruptWithScrollKey);
    };
  }, [cancelCurrentNavigation, scheduleResolve]);

  useEffect(
    () => () => {
      if (resolveFrameRef.current !== null) {
        window.cancelAnimationFrame(resolveFrameRef.current);
      }
      const navigation = navigationRef.current;
      if (navigation) window.cancelAnimationFrame(navigation.frame);
      navigationRef.current = null;
      restoreScrollBehavior();
    },
    [restoreScrollBehavior]
  );

  return {
    activeSection,
    activationBounds,
    cancelNavigation: cancelCurrentNavigation,
    navigateToElement,
    navigateToSection,
    scrollspyState,
    targetOffset
  };
}
