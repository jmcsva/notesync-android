import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Image, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { getNoteById, updateNote, getAttachments, addAttachment, deleteAttachment, getAllNotebooks } from '../utils/database';
import { exportNoteToPDF } from '../utils/pdfExport';
import { generateId, parseTags, formatDate } from '../utils/helpers';
import { Btn, Tag, Input, Select, Divider } from '../components/UI';

export default function NoteEditorScreen({ navigation, route }) {
  const { noteId, notebookId: initNbId, notebookColor = COLORS.accent } = route.params;

  const [note, setNote]               = useState(null);
  const [title, setTitle]             = useState('');
  const [content, setContent]         = useState('');
  const [notebookId, setNotebookId]   = useState(initNbId);
  const [pinned, setPinned]           = useState(false);
  const [tags, setTags]               = useState([]);
  const [tagInput, setTagInput]       = useState('');
  const [attachments, setAttachments] = useState([]);
  const [notebooks, setNotebooks]     = useState([]);
  const [dirty, setDirty]             = useState(false);
  const [saving, setSaving]           = useState(false);

  useEffect(() => { loadNote(); }, [noteId]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8, marginRight: 8 }}>
          <TouchableOpacity onPress={handleExportPDF} style={s.headerBtn}>
            <Text style={{ fontSize: 18 }}>📄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} style={[s.headerBtn, { backgroundColor: notebookColor }]}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
              {saving ? '…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [title, content, notebookId, pinned, tags, dirty, saving]);

  async function loadNote() {
    const [n, nbs, atts] = await Promise.all([
      getNoteById(noteId),
      getAllNotebooks(),
      getAttachments({ noteId }),
    ]);
    if (!n) return;
    setNote(n); setTitle(n.title); setContent(n.content || '');
    setNotebookId(n.notebook_id); setPinned(!!n.pinned);
    setTags(parseTags(n.tags)); setAttachments(atts); setNotebooks(nbs);
  }

  async function handleSave() {
    setSaving(true);
    await updateNote({ id: noteId, title, content, pinned, tags, notebookId });
    setDirty(false); setSaving(false);
    navigation.setOptions({ title: title });
  }

  async function handleExportPDF() {
    await handleSave();
    const nb = notebooks.find(n => n.id === notebookId);
    await exportNoteToPDF({ ...note, title, content, tags: JSON.stringify(tags) }, nb);
  }

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const dest  = FileSystem.documentDirectory + generateId() + '_' + asset.fileName;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    const att = { id: generateId(), noteId, taskId: null, name: asset.fileName, type: 'image/jpeg', uri: dest, size: asset.fileSize || 0 };
    await addAttachment(att); setAttachments(a => [...a, att]); setDirty(true);
  }

  async function pickDocument() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const dest  = FileSystem.documentDirectory + generateId() + '_' + asset.name;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    const att = { id: generateId(), noteId, taskId: null, name: asset.name, type: asset.mimeType, uri: dest, size: asset.size || 0 };
    await addAttachment(att); setAttachments(a => [...a, att]); setDirty(true);
  }

  async function removeAttachment(att) {
    await deleteAttachment(att.id);
    try { await FileSystem.deleteAsync(att.uri, { idempotent: true }); } catch {}
    setAttachments(a => a.filter(x => x.id !== att.id));
  }

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setDirty(true); }
    setTagInput('');
  }

  const nbOptions = notebooks.map(n => ({ value: n.id, label: `${n.icon} ${n.name}` }));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: COLORS.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <TextInput
          value={title} onChangeText={v => { setTitle(v); setDirty(true); }}
          placeholder="Note title..." placeholderTextColor={COLORS.textDim}
          style={s.titleInput}
          multiline
        />

        {/* Meta row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          {notebooks.length > 0 && (
            <Select value={notebookId} onChange={v => { setNotebookId(v); setDirty(true); }} options={nbOptions} />
          )}
          <TouchableOpacity onPress={() => { setPinned(p => !p); setDirty(true); }}
            style={[s.pinBtn, pinned && { backgroundColor: COLORS.accent + '22', borderColor: COLORS.accent }]}>
            <Text>📌</Text>
            <Text style={{ color: pinned ? COLORS.accent : COLORS.textMuted, fontSize: 12, fontWeight: '600' }}>
              {pinned ? 'Pinned' : 'Pin'}
            </Text>
          </TouchableOpacity>
        </View>

        {note && (
          <Text style={{ color: COLORS.textDim, fontSize: 11, marginBottom: 12 }}>
            Created {formatDate(note.created_at)} · Updated {formatDate(note.updated_at)}
          </Text>
        )}

        {/* Tags */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, gap: 4 }}>
          {tags.map(t => (
            <Tag key={t} label={t} color={notebookColor}
              onRemove={() => { setTags(tags.filter(x => x !== t)); setDirty(true); }} />
          ))}
          <TextInput
            value={tagInput} onChangeText={setTagInput}
            onSubmitEditing={addTag} placeholder="+ tag"
            placeholderTextColor={COLORS.textDim}
            returnKeyType="done"
            style={s.tagInput}
          />
        </View>

        <Divider />

        {/* Content */}
        <TextInput
          value={content}
          onChangeText={v => { setContent(v); setDirty(true); }}
          placeholder="Start writing your note..."
          placeholderTextColor={COLORS.textDim}
          multiline
          style={s.contentInput}
        />

        <Divider style={{ marginTop: 8 }} />

        {/* Attachments */}
        <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
              Attachments ({attachments.length})
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Btn label="Image" onPress={pickImage} icon="🖼" small variant="outline" color={notebookColor} />
              <Btn label="PDF / File" onPress={pickDocument} icon="📄" small variant="outline" color={notebookColor} />
            </View>
          </View>

          {attachments.map(att => (
            <View key={att.id} style={s.attRow}>
              {att.type?.includes('image') ? (
                <Image source={{ uri: att.uri }} style={s.attThumb} resizeMode="cover" />
              ) : (
                <View style={s.attIcon}><Text style={{ fontSize: 22 }}>📄</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{att.name}</Text>
                <Text style={{ color: COLORS.textDim, fontSize: 10 }}>
                  {att.type?.includes('image') ? 'Image' : 'PDF'} · {Math.round((att.size || 0) / 1024)} KB
                </Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Remove', `Remove "${att.name}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => removeAttachment(att) },
              ])}>
                <Text style={{ color: COLORS.accent2, fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating save */}
      {dirty && (
        <TouchableOpacity onPress={handleSave} style={[s.fab, { backgroundColor: notebookColor }]}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{saving ? 'Saving…' : '💾 Save'}</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  titleInput: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 12, lineHeight: 30 },
  contentInput: { fontSize: 15, color: COLORS.text, lineHeight: 24, minHeight: 200, paddingTop: 12 },
  tagInput: {
    backgroundColor: COLORS.bg, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, color: COLORS.textMuted, fontSize: 11, width: 70,
  },
  pinBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, padding: 6,
  },
  attRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.sm,
    borderWidth: 1, borderColor: COLORS.border, padding: 8, marginBottom: 6,
  },
  attThumb: { width: 40, height: 40, borderRadius: RADIUS.sm },
  attIcon: { width: 40, height: 40, borderRadius: RADIUS.sm, backgroundColor: COLORS.surface2, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute', bottom: 24, right: 20, left: 20,
    borderRadius: RADIUS.md, padding: 14, alignItems: 'center',
    ...SHADOW,
  },
  headerBtn: {
    padding: 8, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
});
