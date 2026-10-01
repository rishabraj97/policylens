import React from 'react';

/**
 * Standard page wrapper with subtle ambient backdrop and uniform max width
 */
export default function PageContainer({
  children,
  className = '',
  maxWidth = 'max-w-7xl',
}) {
  return (
    <main className={`relative mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-10 ${maxWidth} ${className}`}>
      {children}
    </main>
  );
}

