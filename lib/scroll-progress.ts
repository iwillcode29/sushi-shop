/** The part of a `DOMRect` that scroll progress depends on. */
export interface ScrollRect {
  /** Distance from the viewport's top edge to the section's, in CSS pixels. */
  top: number
  height: number
}

/**
 * How far a tall section has been scrolled through, from 0 to 1.
 *
 * A section with a `position: sticky` child is pinned for as long as the
 * section is taller than the viewport; that surplus height is the travel the
 * scroll gets to spend on whatever the sticky child animates. Progress is
 * measured against that surplus, not against the section's full height, so a
 * 300vh section gives exactly 200vh of animation and lands on 1 at the moment
 * the sticky child unpins.
 *
 * Reading this from a rAF loop and writing the result straight to the DOM is
 * intentional: driving it through React state would re-render the subtree on
 * every scroll frame.
 */
export function sectionProgress(rect: ScrollRect | null, viewportHeight: number): number {
  if (!rect) return 0

  const travel = rect.height - viewportHeight
  // A section no taller than the viewport never pins, so there is no travel to
  // divide by. Treat it as complete the moment it reaches the top rather than
  // dividing by zero and writing NaN into a currentTime or a transform.
  if (travel <= 0) return rect.top <= 0 ? 1 : 0

  return Math.min(1, Math.max(0, -rect.top / travel))
}
