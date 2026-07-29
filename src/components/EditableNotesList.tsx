import React, { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { NoteEntry, NotesFontSize } from '@/data/types';
import { fmtShort } from '@/lib/date';
import { useTheme } from '@/theme/ThemeContext';
import { noteFontSizes, radii, tabBarHeight } from '@/theme/tokens';

const LONG_PRESS_MS = 350;

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
  isActive: boolean;
  theme: ReturnType<typeof useTheme>;
  sizes: (typeof noteFontSizes)[NotesFontSize];
  onLayout: (id: string, y: number, height: number) => void;
  onBeginEdit: (n: NoteEntry) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, translationY: number) => void;
}

function NoteRow({ note, isActive, theme, sizes, onLayout, onBeginEdit, onDelete, onDragStart, onDragEnd }: NoteRowProps) {
  const translateY = useSharedValue(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    onLayout(note.id, e.nativeEvent.layout.y, e.nativeEvent.layout.height);
  };

  const tap = Gesture.Tap().onEnd((_e, success) => {
    if (success) runOnJS(onBeginEdit)(note);
  });

  const pan = Gesture.Pan()
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      runOnJS(onDragStart)(note.id);
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      translateY.value = withSpring(0);
      runOnJS(onDragEnd)(note.id, e.translationY);
    });

  const gesture = Gesture.Exclusive(pan, tap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const draftRef = useRef({ title: '', text: '' });
  const layoutsRef = useRef<Record<string, { y: number; height: number }>>({});

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

  const handleDragStart = (id: string) => {
    setActiveDragId(id);
  };

  const handleDragEnd = (id: string, translationY: number) => {
    setActiveDragId(null);
    const dragged = layoutsRef.current[id];
    const fromIndex = list.findIndex((n) => n.id === id);
    if (!dragged || fromIndex === -1) return;
    const draggedCenter = dragged.y + translationY + dragged.height / 2;

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
        <ScrollView contentContainerStyle={styles.list} style={styles.scroll} keyboardShouldPersistTaps="handled">
          {list.map((n) => (
            <NoteRow
              key={n.id}
              note={n}
              isActive={activeDragId === n.id}
              theme={theme}
              sizes={sizes}
              onLayout={registerLayout}
              onBeginEdit={beginEdit}
              onDelete={(id) => confirmDelete(() => remove(id))}
              onDragStart={handleDragStart}
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
  list: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: tabBarHeight + 16, gap: 8 },
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
