import React, { useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { LinearTransition, runOnJS, SharedValue, useAnimatedStyle } from 'react-native-reanimated';

import { Icon } from '@/components/Icon';
import { NoteEntry, NotesFontSize } from '@/data/types';
import { fmtShort } from '@/lib/date';
import {
  createDragGesture,
  DragInfo,
  DROP_MS,
  Layout,
  useDraggableList,
  useDragRowShift,
} from '@/hooks/useDraggableList';
import { useTheme } from '@/theme/ThemeContext';
import { noteFontSizes, radii, tabBarHeight } from '@/theme/tokens';

const LIST_GAP = 8;
const PREVIEW_MAX_LINES = 12;

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
  dropping: SharedValue<number>;
  onLayout: (id: string, y: number, height: number) => void;
  onBeginEdit: (n: NoteEntry) => void;
  onDismissReveal: () => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragUpdate: (absoluteY: number) => void;
  onDragEnd: (id: string, netTranslationY: number) => void;
  onDropSettled: () => void;
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
  dropping,
  onLayout,
  onBeginEdit,
  onDismissReveal,
  onDelete,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDropSettled,
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

  const pan = createDragGesture({
    rawTranslateY,
    scrollDelta,
    dropping,
    onDragStart: () => onDragStart(note.id),
    onDragUpdate,
    onDragEnd: (netTranslationY) => onDragEnd(note.id, netTranslationY),
    onDropSettled,
  });

  const gesture = Gesture.Exclusive(pan, tap);

  const shiftY = useDragRowShift(dragInfo, isActive, myLayout, rawTranslateY, scrollDelta, dropping, LIST_GAP);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: isActive ? rawTranslateY.value + scrollDelta.value : shiftY.value }],
  }));

  return (
    <Animated.View
      onLayout={handleLayout}
      // Animates the reorder rather than jumping to it, over the same DROP_MS
      // the transforms unwind across. See the note on DROP_MS.
      layout={LinearTransition.duration(DROP_MS)}
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
          <Text
            numberOfLines={PREVIEW_MAX_LINES}
            ellipsizeMode="tail"
            style={[styles.cardText, { color: theme.text, fontSize: sizes.cardText, lineHeight: sizes.cardText * 1.6 }]}
          >
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
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const {
    dragInfo,
    layoutsRef,
    rawTranslateY,
    scrollDelta,
    dropping,
    registerLayout,
    handleDragStart: baseHandleDragStart,
    handleDragUpdate,
    handleDragEnd,
    handleDropSettled,
    scrollHandlers,
  } = useDraggableList<NoteEntry>({
    items: list,
    keyExtractor: (n) => n.id,
    onReorder: reorder,
    scrollRef,
  });

  const beginNew = () => {
    const id = startNew();
    router.push(`/note-editor/${listKey}/${id}`);
  };

  const dismissReveal = () => setRevealedId(null);

  const beginEdit = (n: NoteEntry) => {
    setRevealedId(null);
    router.push(`/note-editor/${listKey}/${n.id}`);
  };

  const handleDragStart = (id: string) => {
    baseHandleDragStart(id);
    setRevealedId(id);
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
          {...scrollHandlers}
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
              dropping={dropping}
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
              onDropSettled={handleDropSettled}
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
