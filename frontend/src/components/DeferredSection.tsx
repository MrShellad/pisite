import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferredSectionProps {
  id: string;
  children: ReactNode;
  placeholderClassName?: string;
}

export default function DeferredSection({
  id,
  children,
  placeholderClassName = 'min-h-[280px]',
}: DeferredSectionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    if (shouldMount) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px 0px' },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [shouldMount]);

  return (
    <div id={id} ref={containerRef}>
      {shouldMount ? (
        children
      ) : (
        <div
          aria-hidden
          className={`animate-pulse rounded-[2rem] border border-neutral-200/70 bg-white/70 shadow-sm dark:border-neutral-800/70 dark:bg-neutral-900/50 ${placeholderClassName}`}
        />
      )}
    </div>
  );
}
