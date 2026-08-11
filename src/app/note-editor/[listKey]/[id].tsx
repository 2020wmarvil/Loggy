import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TextInputContentSizeChangeEventData,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { useNotes, usePhilosophy } from '@/store/useNotes';
import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/theme/ThemeContext';
import { noteFontSizes } from '@/theme/tokens';

export default function NoteEditorScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { listKey, id } = useLocalSearchParams<{ listKey: string; id: string }>();
  const notesHook = useNotes();
  const philosophyHook = usePhilosophy();
  const { list, save, remove } = listKey === 'philosophy' ? philosophyHook : notesHook;
  const { settings } = useSettings();
  const sizes = noteFontSizes[settings.notesFontSize ?? 'medium'];

  const note = list.find((n) => n.id === id);
  const [title, setTitle] = useState(note?.title || '');
  const [text, setText] = useState(note?.text || '');
  const draftRef = useRef({ title: note?.title || '', text: note?.text || '' });
  // The text field grows with its content and scrolling is delegated to the
  // outer ScrollView (see textArea style below) — a plain multiline TextInput's
  // own internal scroll doesn't reliably get keyboard-avoidance or momentum.
  const [bodyHeight, setBodyHeight] = useState(0);

  const onBodySizeChange = (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    setBodyHeight(e.nativeEvent.contentSize.height);
  };

  // Runs on every way this screen can go away (back button, hardware back,
  // swipe-back gesture) — discard a note that was never actually filled in.
  useEffect(() => {
    return () => {
      if (!id) return;
      const t = draftRef.current.title.trim();
      const b = draftRef.current.text.trim();
      if (!t && !b) remove(id);
    };
  }, [id, remove]);

  const onChangeTitle = (v: string) => {
    setTitle(v);
    draftRef.current.title = v;
    if (id) save(id, v.trim(), draftRef.current.text.trim());
  };

  const onChangeText = (v: string) => {
    setText(v);
    draftRef.current.text = v;
    if (id) save(id, draftRef.current.title.trim(), v.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg, paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={[styles.closeBtn, { backgroundColor: theme.s2 }]} hitSlop={8}>
          <Icon name="back" size={16} color={theme.text} strokeWidth={2} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="Title"
          placeholderTextColor={theme.muted2}
          autoFocus
          style={[styles.titleInput, { color: theme.text, fontSize: sizes.editorTitle }]}
        />
        <TextInput
          value={text}
          onChangeText={onChangeText}
          onContentSizeChange={onBodySizeChange}
          placeholder={listKey === 'philosophy' ? 'Write an axiom or principle...' : 'Write a note...'}
          placeholderTextColor={theme.muted2}
          multiline
          scrollEnabled={false}
          style={[
            styles.textArea,
            { color: theme.text, fontSize: sizes.editorBody, lineHeight: sizes.editorBody * 1.53, height: Math.max(bodyHeight, sizes.editorBody * 1.53) },
          ]}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  titleInput: { fontWeight: '700', letterSpacing: -0.2, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  textArea: { paddingHorizontal: 20, paddingTop: 4, textAlignVertical: 'top' },
});
