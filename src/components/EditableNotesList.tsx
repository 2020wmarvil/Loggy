import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  save: (id: string, title: string, text: string) => void;
  remove: (id: string) => void;
  reorder: (next: NoteEntry[]) => void;
  emptyText: string;
  newLabel: string;
  placeholder: string;
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
  myLayout: Layout | undefined;
  theme: ReturnType<typeof useTheme>;
  sizes: (typeof noteFontSizes)[NotesFontSize];
  rawTranslateY: SharedValue<number>;
  scrollDelta: SharedValue<number>;
  onLayout: (id: string, y: number, height: number) => void;
  onBeginEdit: (n: NoteEntry) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragUpdate: (absoluteY: number) => void;
  onDragEnd: (id: string, translationY: number) => void;
}

function NoteRow({
  note,
  dragInfo,
  myLayout,
  theme,
  sizes,
  rawTranslateY,
  scrollDelta,
  onLayout,
  onBeginEdit,
  onDelete,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: NoteRowProps) {
  const isActive = dragInfo?.id === note.id;

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout(note.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
  };

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) runOnJS(onBeginEdit)(note);
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
      target = draggedCenter < myCenter ? -gap : 0;
    } else if (myLayout.y < dragInfo.y) {
      target = draggedCenter > myCenter ? gap : 0;
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
        { backgroundColor: theme.s1, borderColor: isActive ? theme.green : theme.border },
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
        <Pressable onPress={() => onDelete(note.id)} hitSlop={6}>
          <Text style={[styles.actionText, { color: theme.red }]}>Delete</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

export function EditableNotesList({
  list,
  startNew,
  save,
  remove,
  reorder,
  emptyText,
  newLabel,
  placeholder,
  fontSize,
}: EditableNotesListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sizes = noteFontSizes[fontSize];
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const draftRef = useRef({ title: '', text: '' });
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

  // Every change is written straight to storage (not just debounced) so a
  // note survives even if the app is backgrounded or killed mid-edit.
  const persist = (id: string, title: string, text: string) => {
    save(id, title.trim(), text.trim());
  };

  const beginNew = () => {
    const id = startNew();
    draftRef.current = { title: '', text: '' };
    setEditingId(id);
    setDraftTitle('');
    setDraftText('');
  };

  const beginEdit = (n: NoteEntry) => {
    draftRef.current = { title: n.title || '', text: n.text };
    setEditingId(n.id);
    setDraftTitle(n.title || '');
    setDraftText(n.text);
  };

  const closeEditor = () => {
    if (editingId) {
      const title = draftRef.current.title.trim();
      const text = draftRef.current.text.trim();
      if (!title && !text) remove(editingId);
    }
    setEditingId(null);
  };

  const onChangeTitle = (v: string) => {
    setDraftTitle(v);
    draftRef.current.title = v;
    if (editingId) persist(editingId, v, draftRef.current.text);
  };

  const onChangeText = (v: string) => {
    setDraftText(v);
    draftRef.current.text = v;
    if (editingId) persist(editingId, draftRef.current.title, v);
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

  const editingNote = list.find((n) => n.id === editingId) || null;

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <Pressable onPress={beginNew} style={[styles.newBtn, { backgroundColor: theme.greenMid }]}>
          <Text style={[styles.newBtnText, { color: theme.green }]}>{newLabel}</Text>
        </Pressable>
      </View>

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
              myLayout={layoutsRef.current[n.id]}
              theme={theme}
              sizes={sizes}
              rawTranslateY={rawTranslateY}
              scrollDelta={scrollDelta}
              onLayout={registerLayout}
              onBeginEdit={beginEdit}
              onDelete={(id) => confirmDelete(() => remove(id))}
              onDragStart={handleDragStart}
              onDragUpdate={handleDragUpdate}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ScrollView>
      )}

      <Modal
        visible={editingNote !== null}
        animationType={Platform.OS === 'web' ? 'none' : 'slide'}
        presentationStyle="fullScreen"
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={[styles.modalRoot, { backgroundColor: theme.bg, paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={closeEditor} style={[styles.closeBtn, { backgroundColor: theme.s2 }]} hitSlop={8}>
              <Icon name="back" size={16} color={theme.text} strokeWidth={2} />
            </Pressable>
          </View>
          <TextInput
            value={draftTitle}
            onChangeText={onChangeTitle}
            placeholder="Title"
            placeholderTextColor={theme.muted2}
            autoFocus
            style={[styles.titleInputFull, { color: theme.text, fontSize: sizes.editorTitle }]}
          />
          <TextInput
            value={draftText}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={theme.muted2}
            multiline
            style={[
              styles.textAreaFull,
              { color: theme.text, fontSize: sizes.editorBody, lineHeight: sizes.editorBody * 1.53 },
            ]}
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4, alignItems: 'flex-end' },
  newBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  newBtnText: { fontSize: 12.5, fontWeight: '600' },
  empty: { padding: 50, textAlign: 'center', fontSize: 13.5 },
  scroll: { flex: 1 },
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: tabBarHeight + 16, gap: LIST_GAP },
  card: { borderRadius: radii.card, borderWidth: 1, padding: 14 },
  cardActive: { elevation: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, zIndex: 10 },
  cardTitle: { fontWeight: '700', letterSpacing: -0.17, marginBottom: 6 },
  cardText: {},
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 },
  metaDate: { fontSize: 11 },
  actionText: { fontSize: 11, fontWeight: '500' },
  modalRoot: { flex: 1 },
  modalHeader: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  titleInputFull: { fontWeight: '700', letterSpacing: -0.2, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  textAreaFull: { flex: 1, paddingHorizontal: 20, paddingTop: 4, textAlignVertical: 'top' },
});
