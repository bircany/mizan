const videoShareSlug = /^video-kurban-([1-7])-kisilik-grup$/;

function shareCapacity(slug: string): number | null {
  const match = videoShareSlug.exec(slug);
  return match ? Number(match[1]) : null;
}

/** Keep the seven recurring video areas together, in share-count order. */
export function sortVideoShareAreas<T extends { slug: string }>(areas: T[]): T[] {
  return [...areas].sort((left, right) => {
    const leftCapacity = shareCapacity(left.slug);
    const rightCapacity = shareCapacity(right.slug);
    if (leftCapacity !== null && rightCapacity !== null) return leftCapacity - rightCapacity;
    if (leftCapacity !== null) return -1;
    if (rightCapacity !== null) return 1;
    return 0;
  });
}
