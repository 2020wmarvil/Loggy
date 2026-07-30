import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { NoteEntry, NotesFontSize } from '@/data/types';
import { fmtShort } from '@/lib/date';
import { useTheme } from '@/theme/ThemeContext';
import { noteFontSizes, radii, tabBarHeight } from '@/theme/tokens';

const LONG_PRESS_MS = 350;
const AUTO_SCROLL_EDGE_ZONE = 60;
const AUTO_SCROLL_STEP = 14;
const AUTO_SCROLL_INTERVAL_MS = 16;
const LIST_GAP = 8;
const SHIFT_SPRING = { damping: 22, stiffness: 260, mass: 0.6 };

type Layout = { y: number; height: number };
type DragInfo = { id: string; y: number; height: number };

interface EditableNotesListProps {
  list: NoteEntry[];
  startNew: () => string;
  remove: (id: string) => void;
  reorder: (next: NoteEntry[]) => void;
  emptyText: string;
  newLabel: string;
  listKey: 'notes' | 'philosophy';
  fontSize: NotesFontSize;
}

function confirmDelete(onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm('Delete this entry? This cannot be undone.')) onConfirm();
    return;
  }
  Alert.alert('Delete entry?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

interface NoteRowProps {
  note: NoteEntry;
  dragInfo: DragInfo | null;
  revealed: boolean;
  myLayout: Layout | undefined;
  theme: ReturnType<typeof useTheme>;
  sizes: (typeof noteFontSizes)[NotesFontSize];
  rawTranslateY: SharedValue<number>;
  scrollDelta: SharedValue<number>;
  onLayout: (id: string, y: number, height: number) => void;
  onBeginEdit: (n: NoteEntry) => void;
  onDismissReveal: () => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragUpdate: (absoluteY: number) => void;
  onDragEnd: (id: string, translationY: number) => void;
}

function NoteRow({
  note,
  dragInfo,
  revealed,
  myLayout,
  theme,
  sizes,
  rawTranslateY,
  scrollDelta,
  onLayout,
  onBeginEdit,
  onDismissReveal,
  onDelete,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: NoteRowProps) {
  const isActive = dragInfo?.id === note.id;

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout(note.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
  };

  // A follow-up tap while Delete is revealed just dismisses it (matches the
  // usual "tap elsewhere to cancel" pattern) instead of opening the note.
  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (!success) return;
    if (revealed) runOnJS(onDismissReveal)();
    else runOnJS(onBeginEdit)(note);
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      rawTranslateY.value = 0;
      runOnJS(onDragStart)(note.id);
    })
    .onUpdate((e) => {
      rawTranslateY.value = e.translationY;
      runOnJS(onDragUpdate)(e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(onDragEnd)(note.id, e.translationY);
      rawTranslateY.value = withSpring(0);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  // While another row is being dragged, spring this row out of the way once
  // the dragged card's center has crossed past it — makes room to "land" in.
  const shiftY = useDerivedValue(() => {
    if (!dragInfo || isActive || !myLayout) return withSpring(0, SHIFT_SPRING);
    const gap = dragInfo.height + LIST_GAP;
    const draggedCenter = dragInfo.y + rawTranslateY.value + scrollDelta.value + dragInfo.height / 2;
    const myCenter = myLayout.y + myLayout.height / 2;
    let target = 0;
    if (myLayout.y > dragInfo.y) {
      // I start out below the dragged item — shift up once it's been dragged past me.
      target = draggedCenter > myCenter ? -gap : 0;
    } else if (myLayout.y < dragInfo.y) {
      // I start out above the dragged item — shift down once it's been dragged past me.
      target = draggedCenter < myCenter ? gap : 0;
    }
    return withSpring(target, SHIFT_SPRING);
  }, [dragInfo, isActive, myLayout]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isActive ? rawTranslateY.value + scrollDelta.value : shiftY.value }],
  }));

  return (
    <Animated.View
      onLayout={handleLayout}
      style={[
        styles.card,
        { backgroundColor: theme.s1, borderColor: isActive || revealed ? theme.green : theme.border },
        isActive && styles.cardActive,
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={gesture}>
        <View>
          {!!note.title && (
            <Text style={[styles.cardTitle, { color: theme.text, fontSize: sizes.cardTitle }]}>{note.title}</Text>
          )}
          <Text style={[styles.cardText, { color: theme.text, fontSize: sizes.cardText, lineHeight: sizes.cardText * 1.6 }]}>
            {note.text}
          </Text>
        </View>
      </GestureDetector>
      <View style={styles.meta}>
        <Text style={[styles.metaDate, { color: theme.muted }]}>{fmtShort(note.updatedAt)}</Text>
        {revealed && (
          <Pressable onPress={() => onDelete(note.id)} hitSlop={6}>
            <Text style={[styles.actionText, { color: theme.red }]}>Delete</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export function EditableNotesList({
  list,
  startNew,
  remove,
  reorder,
  emptyText,
  newLabel,
  listKey,
  fontSize,
}: EditableNotesListProps) {
  const theme = useTheme();
  const router = useRouter();
  const sizes = noteFontSizes[fontSize];
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const layoutsRef = useRef<Record<string, Layout>>({});
  const rawTranslateY = useSharedValue(0);
  const scrollDelta = useSharedValue(0);

  const scrollRef = useRef<ScrollView>(null);
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

  const beginNew = () => {
    const id = startNew();
    router.push(`/note-editor/${listKey}/${id}`);
  };

  const dismissReveal = () => setRevealedId(null);

  const beginEdit = (n: NoteEntry) => {
    setRevealedId(null);
    router.push(`/note-editor/${listKey}/${n.id}`);
  };

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
      scrollRef.current?.scrollTo({ y: next, animated: false });
      scrollDelta.value = next - scrollOffsetAtDragStartRef.current;
    }, AUTO_SCROLL_INTERVAL_MS);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
  };

  const handleDragStart = (id: string) => {
    const layout = layoutsRef.current[id];
    setDragInfo(layout ? { id, y: layout.y, height: layout.height } : null);
    setRevealedId(id);
    scrollDelta.value = 0;
    scrollOffsetAtDragStartRef.current = scrollOffsetRef.current;
    // ScrollView forwards `measure` from its underlying native view at runtime,
    // but the type definitions don't expose it on the ScrollView class.
    type MeasureFn = (cb: (x: number, y: number, w: number, h: number, pageX: number, pageY: number) => void) => void;
    (scrollRef.current as unknown as { measure?: MeasureFn })?.measure?.((_x, _y, _w, h, _pageX, pageY) => {
      containerBoundsRef.current = { top: pageY, bottom: pageY + h };
    });
  };

  const handleDragUpdate = (absoluteY: number) => {
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
    const fromIndex = list.findIndex((n) => n.id === id);
    if (!dragged || fromIndex === -1) {
      scrollDelta.value = 0;
      return;
    }
    const netTranslation = translationY + scrollDelta.value;
    const draggedCenter = dragged.y + netTranslation + dragged.height / 2;

    // Find where the dragged item's current center falls among the OTHER
    // items (dragged item excluded), then insert it there.
    const others = list.filter((n) => n.id !== id);
    let targetIndex = others.length;
    for (let i = 0; i < others.length; i++) {
      const l = layoutsRef.current[others[i].id];
      if (!l) continue;
      if (draggedCenter < l.y + l.height / 2) {
        targetIndex = i;
        break;
      }
    }
    scrollDelta.value = 0;
    const next = others.slice();
    next.splice(targetIndex, 0, list[fromIndex]);
    reorder(next);
  };

  return (
    <View style={styles.root}>
      {list.length === 0 ? (
        <Text style={[styles.empty, { color: theme.muted }]}>{emptyText}</Text>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.list}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onLayout={(e) => {
            containerHeightRef.current = e.nativeEvent.layout.height;
          }}
          onContentSizeChange={(_w, h) => {
            contentHeightRef.current = h;
          }}
        >
          {list.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              dragInfo={dragInfo}
              revealed={revealedId === n.id}
              myLayout={layoutsRef.current[n.id]}
              theme={theme}
              sizes={sizes}
              rawTranslateY={rawTranslateY}
              scrollDelta={scrollDelta}
              onLayout={registerLayout}
              onBeginEdit={beginEdit}
              onDismissReveal={dismissReveal}
              onDelete={(id) => confirmDelete(() => {
                setRevealedId(null);
                remove(id);
              })}
              onDragStart={handleDragStart}
              onDragUpdate={handleDragUpdate}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={beginNew}
        accessibilityLabel={newLabel}
        style={[styles.fab, { backgroundColor: theme.green }]}
      >
        <Icon name="plus" size={24} color="#000" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  empty: { padding: 50, textAlign: 'center', fontSize: 13.5 },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: tabBarHeight + 16, gap: LIST_GAP },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 14 },
  cardActive: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 10 },
  cardTitle: { fontWeight: '700', letterSpacing: -0.17, marginBottom: 6 },
  cardText: {},
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  metaDate: { fontSize: 11 },
  actionText: { fontSize: 11, fontWeight: '500' },
});
