import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { getNotesByNotebook, createNote, deleteNote, searchNotes } from '../utils/database';
import { generateId, formatRelative, parseTags } from '../utils/helpers';
import { Btn, Empty, Tag, ScreenHeader } from '../components/UI';

export default function NotesListScreen({ navigation, route }) {
  const { notebookId = 'all', notebookName = 'All Notes', notebookColor = COLORS.accent } = route.params || {};
  const [notes, setNotes]     = useState([]);
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => { load(); }, [notebookId]));

  async function load(q = '') {
    setLoading(true);
    const data = q ? await searchNotes(q) : await getNotesByNotebook(notebookId);
    setNotes(data);
    setLoading(false);
  }

  function handleSearch(q) {
    setQuery(q);
    if (q.length === 0 || q.length > 1) load(q);
  }

  async function handleNew() {
    const id = generateId();
    const nbId = notebookId === 'all' ? 'nb1' : notebookId;
    await createNote({ id, notebookId: nbId, title: 'New Note', content: '' });
    navigation.navigate('NoteEditor', { noteId: id, notebookId: nbId, notebookColor });
  }

  function handleDelete(note) {
    Alert.alert('Delete Note', `Delete "${note.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNote(note.id); load(); } },
    ]);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title={notebookName}
        subtitle={`${notes.length} note${notes.length !== 1 ? 's' : ''}`}
        right={<Btn label="+ New" onPress={handleNew} color={notebookColor} small />}
      />

      {/* Search */}
      <View style={s.searchWrap}>
        <Text style={{ color: COLORS.textDim, marginRight: 8 }}>🔍</Text>
        <TextInput
          value={query} onChangeText={handleSearch}
          placeholder="Search notes..." placeholderTextColor={COLORS.textDim}
          style={s.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); load(''); }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {notes.length === 0 ? (
        <Empty icon="📝" title="No notes here" subtitle="Tap + New to create your first note"
          action={handleNew} actionLabel="New Note" />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: note }) => {
            const tags = parseTags(note.tags);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[s.noteCard, note.pinned && { borderColor: notebookColor + '66' }, SHADOW]}
                onPress={() => navigation.navigate('NoteEditor', { noteId: note.id, notebookId: note.notebook_id, notebookColor })}
                onLongPress={() => handleDelete(note)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
                  <Text style={s.noteTitle} numberOfLines={1}>{note.title}</Text>
                  {note.pinned ? <Text style={{ fontSize: 12, marginLeft: 4 }}>📌</Text> : null}
                </View>
                {note.content?.length > 0 && (
                  <Text style={s.notePreview} numberOfLines={2}>{note.content}</Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 4 }}>
                  {tags.slice(0, 3).map(t => <Tag key={t} label={t} color={notebookColor} />)}
                  <Text style={{ color: COLORS.textDim, fontSize: 10, marginLeft: 'auto' }}>
                    {formatRelative(note.updated_at)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, marginHorizontal: 12, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },
  noteCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 8,
  },
  noteTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15, flex: 1 },
  notePreview: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
});
