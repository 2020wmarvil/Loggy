import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { EditableNotesList } from '@/components/EditableNotesList';
import { AphorismsView } from '@/components/notes/AphorismsView';
import { SubTabs } from '@/components/SubTabs';
import { useNotes, usePhilosophy } from '@/store/useNotes';
import { useSettings } from '@/store/useSettings';
import { useTheme } from '@/theme/ThemeContext';
import { tabBarHeight } from '@/theme/tokens';

type SubTab = 'notes' | 'philosophy' | 'aphorisms';

export default function NotesScreen() {
  const theme = useTheme();
  const [subtab, setSubtab] = useState<SubTab>('notes');
  const notes = useNotes();
  const philosophy = usePhilosophy();
  const { settings } = useSettings();
  const notesFontSize = settings.notesFontSize ?? 'medium';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={styles.head}>
        <Text style={[styles.title, { color: theme.text }]}>Notes</Text>
      </View>
      <SubTabs
        tabs={[
          { id: 'notes', label: 'Notes' },
          { id: 'philosophy', label: 'Philosophy' },
          { id: 'aphorisms', label: 'Aphorisms' },
        ]}
        active={subtab}
        onChange={setSubtab}
      />
      {subtab === 'notes' && (
        <EditableNotesList
          list={notes.list}
          startNew={notes.startNew}
          remove={notes.remove}
          reorder={notes.reorder}
          emptyText="No notes yet. Jot down thoughts, progress, anything on your mind."
          newLabel="+ New note"
          listKey="notes"
          fontSize={notesFontSize}
        />
      )}
      {subtab === 'philosophy' && (
        <EditableNotesList
          list={philosophy.list}
          startNew={philosophy.startNew}
          remove={philosophy.remove}
          reorder={philosophy.reorder}
          emptyText="No entries yet."
          newLabel="+ New entry"
          listKey="philosophy"
          fontSize={notesFontSize}
        />
      )}
      {subtab === 'aphorisms' && (
        <ScrollView contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }} keyboardShouldPersistTaps="handled">
          <AphorismsView />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 22 },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.945 },
});
