import { useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  SharedValue,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export type Layout = { y: number; height: number };
export type DragInfo = { id: string; y: number; height: number };
// Handlers a caller must attach to whichever ScrollView owns the list's
// `scrollRef`, so edge auto-scroll can track offset/container/content size.
// Needed as a standalone type when that ScrollView is owned by an ancestor
// rather than rendered by the same component that calls useDraggableList.
export type DraggableListScrollHandlers = {
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout: (e: { nativeEvent: { layout: { height: number } } }) => void;
  onContentSizeChange: (w: number, h: number) => void;
};

export const SHIFT_SPRING = { damping: 22, stiffness: 260, mass: 0.6 };

// A drop changes two things that live on two different threads: the array
// reorders (React commit -> new native layout) and the drag transforms unwind
// (Reanimated, UI thread). Those can't be made to land on the same frame, so
// whichever arrives first leaves at least one frame rendering the new layout
// with stale transforms — every row displaced by a row height, the dragged row
// flung off-screen. Rather than chase simultaneity, nothing snaps: the row
// layout change, the sibling shifts and the dragged row's translate all
// animate over this one duration. At t=0 that's the old layout plus full
// transforms, which sums to exactly where the row already is; at t=1 it's the
// new layout with zero transform; every frame between is an interpolation of
// both. All three durations MUST stay equal.
export const DROP_MS = 200;

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
  // 1 for the length of the drop animation. Read as a shared value inside the
  // shift worklet rather than passed in as a hook dependency, so it takes
  // effect on the UI thread with no React round-trip.
  const dropping = useSharedValue(0);

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

  // Only lower `dropping` once React has actually committed the cleared
  // dragInfo. Doing it inline in handleDropSettled would let the shift worklet
  // re-run against a stale dragInfo paired with the post-reorder layout, which
  // is the same mismatch the whole drop animation exists to avoid.
  useEffect(() => {
    if (dragInfo === null) dropping.value = 0;
  }, [dragInfo, dropping]);

  const registerLayout = (id: string, y: number, height: number) => {
    // Skip no-op writes: a fresh { y, height } object on every layout pass
    // changes the identity the rows read out of layoutsRef, which tears down
    // and rebuilds their shift worklets mid-spring.
    const prev = layoutsRef.current[id];
    if (prev && prev.y === y && prev.height === height) return;
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
      // The gesture zeroes scrollDelta on the UI thread the instant it ends;
      // this timer lives on the JS thread and can still tick once before
      // stopAutoScroll() lands, which would put the offset back.
      if (!dir || dropping.value === 1) return;
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

  // Reorders the array but deliberately leaves dragInfo in place: the dragged
  // row has to keep rendering off rawTranslateY until that has finished
  // unwinding, or it hard-switches to its shift value and snaps.
  // `netTranslationY` already has the auto-scroll offset folded in by the
  // gesture, since scrollDelta is zeroed there in the same UI-thread tick.
  const handleDragEnd = (id: string, netTranslationY: number) => {
    stopAutoScroll();
    const dragged = layoutsRef.current[id];
    const fromIndex = items.findIndex((it) => keyExtractor(it) === id);
    if (!dragged || fromIndex === -1) return;
    const draggedCenter = dragged.y + netTranslationY + dragged.height / 2;

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
    const next = others.slice();
    next.splice(targetIndex, 0, items[fromIndex]);
    onReorder(next);
  };

  // Runs once the dragged row's translate has finished animating back to zero.
  const handleDropSettled = () => {
    setDragInfo(null);
  };

  return {
    dragInfo,
    layoutsRef,
    rawTranslateY,
    scrollDelta,
    dropping,
    registerLayout,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd,
    handleDropSettled,
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
  dropping: SharedValue<number>,
  gap: number
) {
  // Depend on primitives, never on the dragInfo/myLayout objects: myLayout in
  // particular is a fresh object off registerLayout, so its identity churn
  // would rebuild the worklet constantly, and a rebuilt worklet drops its
  // in-flight spring and re-emits discontinuously (rows teleporting a whole
  // row height in one frame — a spring can't physically do that).
  const dragId = dragInfo?.id ?? null;
  const dragY = dragInfo?.y ?? 0;
  const dragHeight = dragInfo?.height ?? 0;
  const hasLayout = !!myLayout;
  const myY = myLayout?.y ?? 0;
  const myHeight = myLayout?.height ?? 0;

  return useDerivedValue(() => {
    // Checked first, and off a shared value rather than a dependency, so the
    // unwind starts on the same UI-thread frame the gesture ended on.
    if (dropping.value === 1) return withTiming(0, { duration: DROP_MS });
    if (!dragId || isActive || !hasLayout) return withSpring(0, SHIFT_SPRING);
    const gapPx = dragHeight + gap;
    const draggedCenter = dragY + rawTranslateY.value + scrollDelta.value + dragHeight / 2;
    const myCenter = myY + myHeight / 2;
    let target = 0;
    if (myY > dragY) {
      // I start out below the dragged item — shift up once it's been dragged past me.
      target = draggedCenter > myCenter ? -gapPx : 0;
    } else if (myY < dragY) {
      // I start out above the dragged item — shift down once it's been dragged past me.
      target = draggedCenter < myCenter ? gapPx : 0;
    }
    return withSpring(target, SHIFT_SPRING);
  }, [dragId, dragY, dragHeight, isActive, hasLayout, myY, myHeight, gap]);
}

// Long-press-then-drag Pan gesture wired up to the hook's handlers. Combine
// with a Tap gesture via `Gesture.Exclusive` if the row is also pressable
// (e.g. notes); attach it to a small handle icon instead if the row already
// contains its own interactive fields (e.g. inline text inputs), so dragging
// doesn't fight with typing.
export function createDragGesture({
  longPressMs = 350,
  rawTranslateY,
  scrollDelta,
  dropping,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDropSettled,
}: {
  longPressMs?: number;
  rawTranslateY: SharedValue<number>;
  scrollDelta: SharedValue<number>;
  dropping: SharedValue<number>;
  onDragStart: () => void;
  onDragUpdate: (absoluteY: number) => void;
  onDragEnd: (netTranslationY: number) => void;
  onDropSettled: () => void;
}) {
  return Gesture.Pan()
    .activateAfterLongPress(longPressMs)
    .onStart(() => {
      dropping.value = 0;
      // Assigning here cancels any drop unwind still in flight; its completion
      // callback then reports finished === false, so the previous drop can't
      // clear the drag we're starting right now.
      rawTranslateY.value = 0;
      scrollDelta.value = 0;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      rawTranslateY.value = e.translationY;
      runOnJS(onDragUpdate)(e.absoluteY);
    })
    .onEnd((e) => {
      // The dragged row renders at rawTranslateY + scrollDelta. Fold the
      // auto-scroll offset into the translation so a single value unwinds to
      // zero — same visual position, one animation instead of two.
      const net = e.translationY + scrollDelta.value;
      rawTranslateY.value = net;
      scrollDelta.value = 0;
      dropping.value = 1;
      runOnJS(onDragEnd)(net);
      rawTranslateY.value = withTiming(0, { duration: DROP_MS }, (finished) => {
        if (finished) runOnJS(onDropSettled)();
      });
    });
}
