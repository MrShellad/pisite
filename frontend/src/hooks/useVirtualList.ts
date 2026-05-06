import { useEffect, useMemo, useRef, useState } from 'react';
import type { UIEvent } from 'react';

export function useVirtualList<T>(items: T[], rowHeight: number, overscan = 6) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateHeight = () => setViewportHeight(element.clientHeight);
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const state = useMemo(() => {
    const safeRowHeight = Math.max(1, rowHeight);
    const totalHeight = items.length * safeRowHeight;
    const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
    const effectiveScrollTop = Math.min(scrollTop, maxScrollTop);
    const startIndex = Math.max(0, Math.floor(effectiveScrollTop / safeRowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / safeRowHeight) + overscan * 2;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return {
      startIndex,
      endIndex,
      virtualItems: items.slice(startIndex, endIndex),
      paddingTop: startIndex * safeRowHeight,
      paddingBottom: Math.max(0, (items.length - endIndex) * safeRowHeight),
      totalHeight,
    };
  }, [items, overscan, rowHeight, scrollTop, viewportHeight]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  };

  return {
    containerRef,
    handleScroll,
    ...state,
  };
}
