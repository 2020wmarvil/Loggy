import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export type Layout = { y: number; height: number };
export type DragInfo = { id: string; y: number; height: number };

export const SHIFT_SPRING = { damping: 22, stiffness: 260, mass: 0.6 };

const AUTO_SCROLL_EDGE_ZONE = 60;
const AUTO_SCROLL_STEP = 14;
const AUTO_SCROLL_INTERVAL_MS = 16;

interface UseDraggableListOptions<T> {
  items: T[];
  keyExtractor: (item: T) => string;
  onReorder: (next: T[]) => void;
  // Owning ScrollView, so dragging near an edge auto-scrolls it. Omit for a
  // list nested inside someone else's scroll container — dragging still
  // reorders, it just won't auto-scroll near the edges.
  scrollRef?: React.RefObject<ScrollView | null>;
}

// Shared "long-press then drag to reorder" engine behind both the notes list
// and the lifting exercise list: tracks each row's on-screen layout, figures
// out where a dropped row lands among its siblings, and (optionally) auto-
// scrolls the owning list while dragging past its edge.
export function useDraggableList<T>({ items, keyExtractor, onReorder, scrollRef }: UseDraggableListOptions<T>) {
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const layoutsRef = useRef<Record<string, Layout>>({});
  const rawTranslateY = useSharedValue(0);
  const scrollDelta = useSharedValue(0);

  const scrollOffsetRef = useRef(0);
  const scrollOffsetAtDragStartRef = useRef(0);
  const containerBoundsRef = useRef<{ top: number; bottom: number } | null>(null);
  const containerHeightRef = useRef(0);
  const contentHeightRef = useRef(0);
  const autoScrollDirectionRef = useRef<1 | -1 | 0>(0);
  const autoScrollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (autoScrollTimerRef.current) clearInterval(autoScrollTimerRef.current);
    };
  }, []);

  const registerLayout = (id: string, y: number, height: number) => {
    layoutsRef.current[id] = { y, height };
  };

  const stopAutoScroll = () => {
    autoScrollDirectionRef.current = 0;
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
      autoScrollTimerRef.current = null;
    }
  };

  const startAutoScroll = (direction: 1 | -1) => {
    if (autoScrollDirectionRef.current === direction) return;
    autoScrollDirectionRef.current = direction;
    if (autoScrollTimerRef.current) return;
    autoScrollTimerRef.current = setInterval(() => {
      const dir = autoScrollDirectionRef.current;
      if (!dir) return;
      const maxOffset = Math.max(0, contentHeightRef.current - containerHeightRef.current);
      const next = Math.max(0, Math.min(maxOffset, scrollOffsetRef.current + dir * AUTO_SCROLL_STEP));
      if (next === scrollOffsetRef.current) return;
      scrollOffsetRef.current = next;
      scrollRef?.current?.scrollTo({ y: next, animated: false });
      scrollDelta.value = next - scrollOffsetAtDragStartRef.current;
    }, AUTO_SCROLL_INTERVAL_MS);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  };

  const handleContainerLayout = (e: { nativeEvent: { layout: { height: number } } }) => {
    containerHeightRef.current = e.nativeEvent.layout.height;
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    contentHeightRef.current = h;
  };

  const handleDragStart = (id: string) => {
    const layout = layoutsRef.current[id];
    setDragInfo(layout ? { id, y: layout.y, height: layout.height } : null);
    scrollDelta.value = 0;
    scrollOffsetAtDragStartRef.current = scrollOffsetRef.current;
    if (!scrollRef?.current) return;
    // ScrollView forwards `measure` from its underlying native view at runtime,
    // but the type definitions don't expose it on the ScrollView class.
    type MeasureFn = (cb: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void;
    (scrollRef.current as unknown as { measure?: MeasureFn }).measure?.((_x, _y, _w, h, _pageX, pageY) => {
      containerBoundsRef.current = { top: pageY, bottom: pageY + h };
    });
  };

  const handleDragUpdate = (absoluteY: number) => {
    if (!scrollRef) return;
    const bounds = containerBoundsRef.current;
    if (!bounds) return;
    if (absoluteY < bounds.top + AUTO_SCROLL_EDGE_ZONE) {
      startAutoScroll(-1);
    } else if (absoluteY > bounds.bottom - AUTO_SCROLL_EDGE_ZONE) {
      startAutoScroll(1);
    } else {
      stopAutoScroll();
    }
  };

  const handleDragEnd = (id: string, translationY: number) => {
    stopAutoScroll();
    setDragInfo(null);
    const dragged = layoutsRef.current[id];
    const fromIndex = items.findIndex((it) => keyExtractor(it) === id);
    if (!dragged || fromIndex === -1) {
      scrollDelta.value = 0;
      return;
    }
    const netTranslation = translationY + scrollDelta.value;
    const draggedCenter = dragged.y + netTranslation + dragged.height / 2;

    // Find where the dragged item's current center falls among the OTHER
    // items (dragged item excluded), then insert it there.
    const others = items.filter((it) => keyExtractor(it) !== id);
    let targetIndex = others.length;
    for (let i = 0; i < others.length; i++) {
      const l = layoutsRef.current[keyExtractor(others[i])];
      if (!l) continue;
      if (draggedCenter < l.y + l.height / 2) {
        targetIndex = i;
        break;
      }
    }
    scrollDelta.value = 0;
    const next = others.slice();
    next.splice(targetIndex, 0, items[fromIndex]);
    onReorder(next);
  };

  return {
    dragInfo,
    layoutsRef,
    rawTranslateY,
    scrollDelta,
    registerLayout,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    scrollHandlers: {
      onScroll: handleScroll,
      onLayout: handleContainerLayout,
      onContentSizeChange: handleContentSizeChange,
    },
  };
}

// Springs a row out of the way once the dragged row's center has crossed past
// it, making room to "land" in — shared by every draggable row so the notes
// list and the lifting exercise list animate identically.
export function useDragRowShift(
  dragInfo: DragInfo | null,
  isActive: boolean,
  myLayout: Layout | undefined,
  rawTranslateY: SharedValue<number>,
  scrollDelta: SharedValue<number>,
  gap: number
) {
  return useDerivedValue(() => {
    if (!dragInfo || isActive || !myLayout) return withSpring(0, SHIFT_SPRING);
    const gapPx = dragInfo.height + gap;
    const draggedCenter = dragInfo.y + rawTranslateY.value + scrollDelta.value + dragInfo.height / 2;
    const myCenter = myLayout.y + myLayout.height / 2;
    let target = 0;
    if (myLayout.y > dragInfo.y) {
      // I start out below the dragged item — shift up once it's been dragged past me.
      target = draggedCenter > myCenter ? -gapPx : 0;
    } else if (myLayout.y < dragInfo.y) {
      // I start out above the dragged item — shift down once it's been dragged past me.
      target = draggedCenter < myCenter ? gapPx : 0;
    }
    return withSpring(target, SHIFT_SPRING);
  }, [dragInfo, isActive, myLayout]);
}

// Long-press-then-drag Pan gesture wired up to the hook's handlers. Combine
// with a Tap gesture via `Gesture.Exclusive` if the row is also pressable
// (e.g. notes); attach it to a small handle icon instead if the row already
// contains its own interactive fields (e.g. inline text inputs), so dragging
// doesn't fight with typing.
export function createDragGesture({
  longPressMs = 350,
  rawTranslateY,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: {
  longPressMs?: number;
  rawTranslateY: SharedValue<number>;
  onDragStart: () => void;
  onDragUpdate: (absoluteY: number) => void;
  onDragEnd: (translationY: number) => void;
}) {
  return Gesture.Pan()
    .activateAfterLongPress(longPressMs)
    .onStart(() => {
      rawTranslateY.value = 0;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      rawTranslateY.value = e.translationY;
      runOnJS(onDragUpdate)(e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(onDragEnd)(e.translationY);
      rawTranslateY.value = withSpring(0);
    });
}
