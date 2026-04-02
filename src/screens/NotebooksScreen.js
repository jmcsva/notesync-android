import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, Modal, Pressable, Alert, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, NB_COLORS, NB_ICONS, RADIUS, SHADOW } from '../utils/theme';
import { getAllNotebooks, createNotebook, deleteNotebook, getNotesByNotebook } from '../utils/database';
import { generateId } from '../utils/helpers';
import { Btn, Input, Empty, ScreenHeader } from '../components/UI';

export default function NotebooksScreen({ navigation }) {
  const [notebooks, setNotebooks]   = useState([]);
  const [noteCounts, setNoteCounts] = useState({});
  const [showNew, setShowNew]       = useState(false);
  const [name, setName]             = useState('');
  const [icon, setIcon]             = useState('📓');
  const [color, setColor]           = useState(COLORS.accent);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const nbs = await getAllNotebooks();
    setNotebooks(nbs);
    const counts = {};
    for (const nb of nbs) {
      const notes = await getNotesByNotebook(nb.id);
      counts[nb.id] = notes.length;
    }
    setNoteCounts(counts);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    await createNotebook({ id: generateId(), name: name.trim(), icon, color });
    setName(''); setIcon('📓'); setColor(COLORS.accent); setShowNew(false);
    load();
  }

  function handleDelete(nb) {
    Alert.alert('Delete Notebook', `Delete "${nb.name}" and ALL its notes?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteNotebook(nb.id); load(); } },
    ]);
  }

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Notebooks"
        subtitle={`${notebooks.length} notebook${notebooks.length !== 1 ? 's' : ''}`}
        right={<Btn label="+ New" onPress={() => setShowNew(true)} color={COLORS.accent} small />}
      />

      {notebooks.length === 0 ? (
        <Empty icon="📚" title="No notebooks yet" subtitle="Create your first notebook to start organizing notes" action={() => setShowNew(true)} actionLabel="Create Notebook" />
      ) : (
        <FlatList
          data={notebooks}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12 }}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          renderItem={({ item: nb }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[s.nbCard, { borderColor: nb.color + '55', flex: 1 }, SHADOW]}
              onPress={() => navigation.navigate('Notes', { notebookId: nb.id, notebookName: nb.name, notebookColor: nb.color })}
              onLongPress={() => handleDelete(nb)}
            >
              <Text style={{ fontSize: 32, marginBottom: 8 }}>{nb.icon}</Text>
              <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 15, marginBottom: 2 }}>{nb.name}</Text>
              <Text style={{ color: nb.color, fontSize: 12, fontWeight: '600' }}>
                {noteCounts[nb.id] || 0} note{noteCounts[nb.id] !== 1 ? 's' : ''}
              </Text>
              <View style={[s.nbDot, { backgroundColor: nb.color }]} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* New Notebook Modal */}
      <Modal visible={showNew} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowNew(false)}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>New Notebook</Text>
            <Input label="Name" value={name} onChangeText={setName} placeholder="e.g. Research" />

            <Text style={s.sublabel}>ICON</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {NB_ICONS.map(e => (
                  <TouchableOpacity key={e} onPress={() => setIcon(e)}
                    style={[s.iconBtn, icon === e && { backgroundColor: COLORS.accent + '33', borderColor: COLORS.accent }]}>
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.sublabel}>COLOR</Text>
            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {NB_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setColor(c)}
                  style={[s.colorDot, { backgroundColor: c }, color === c && s.colorDotActive]} />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="Cancel" onPress={() => setShowNew(false)} variant="outline" color={COLORS.textMuted} style={{ flex: 1 }} />
              <Btn label="Create" onPress={handleCreate} color={COLORS.accent} style={{ flex: 1 }} disabled={!name.trim()} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  nbCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1,
    padding: 16, marginBottom: 10, position: 'relative', overflow: 'hidden',
  },
  nbDot: { position: 'absolute', top: -12, right: -12, width: 48, height: 48, borderRadius: 24, opacity: 0.15 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 24, paddingBottom: 40 },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  sublabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#fff' },
});
