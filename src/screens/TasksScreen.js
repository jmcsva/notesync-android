import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Modal, Pressable, ScrollView, TextInput, Alert, Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS, RADIUS, SHADOW, PRIORITY_COLORS, STATUS_COLORS } from '../utils/theme';
import {
  getAllTasks, createTask, updateTask, deleteTask,
  getComments, addComment, deleteComment, getAttachments, addAttachment, deleteAttachment,
} from '../utils/database';
import { scheduleTaskReminder, cancelTaskReminder } from '../utils/notifications';
import { generateId, formatDateTime, parseTags, isOverdue } from '../utils/helpers';
import { Btn, Input, Select, Tag, Badge, Empty, Divider, ScreenHeader, Card } from '../components/UI';

const PRIORITY_OPTS = [
  { value: 'high', label: '🔴 High' },
  { value: 'medium', label: '🟡 Medium' },
  { value: 'low', label: '🔵 Low' },
];
const STATUS_OPTS = [
  { value: 'pending', label: '⏳ Pending' },
  { value: 'in-progress', label: '🔄 In Progress' },
  { value: 'done', label: '✅ Done' },
];
const REPEAT_OPTS = [
  { value: 'none', label: 'No repeat' },
  { value: 'daily', label: '🔁 Daily' },
  { value: 'weekly', label: '📅 Weekly' },
  { value: 'monthly', label: '🗓 Monthly' },
];

export default function TasksScreen() {
  const [tasks, setTasks]         = useState([]);
  const [filter, setFilter]       = useState('all');
  const [selected, setSelected]   = useState(null);
  const [comments, setComments]   = useState([]);
  const [attachments, setAtts]    = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showNew, setShowNew]     = useState(false);
  const [draft, setDraft]         = useState(emptyDraft());

  useFocusEffect(useCallback(() => { loadTasks(); }, []));

  function emptyDraft() {
    return { title: '', description: '', dueDate: '', dueTime: '09:00', priority: 'medium', status: 'pending', repeat: 'none' };
  }

  async function loadTasks() {
    const data = await getAllTasks();
    setTasks(data);
  }

  async function openTask(task) {
    const [cmts, atts] = await Promise.all([getComments(task.id), getAttachments({ taskId: task.id })]);
    setComments(cmts); setAtts(atts); setSelected(task);
  }

  async function handleCreate() {
    if (!draft.title.trim()) return;
    const id = generateId();
    await createTask({ id, ...draft, tags: [] });
    // Schedule notification
    if (draft.dueDate) {
      const notifId = await scheduleTaskReminder({ taskId: id, title: draft.title, dueDate: draft.dueDate, dueTime: draft.dueTime, repeat: draft.repeat });
      if (notifId) await updateTask({ id, ...draft, tags: [], notificationId: notifId });
    }
    setDraft(emptyDraft()); setShowNew(false); loadTasks();
  }

  async function handleStatusToggle(task) {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    await updateTask({ ...task, status: newStatus, tags: parseTags(task.tags) });
    if (newStatus === 'done') await cancelTaskReminder(task.id);
    loadTasks();
    if (selected?.id === task.id) setSelected(t => ({ ...t, status: newStatus }));
  }

  async function handleDelete(task) {
    Alert.alert('Delete Task', `Delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await cancelTaskReminder(task.id);
        await deleteTask(task.id); setSelected(null); loadTasks();
      }},
    ]);
  }

  async function handleAddComment() {
    if (!newComment.trim() || !selected) return;
    const c = { id: generateId(), taskId: selected.id, text: newComment.trim() };
    await addComment(c); setComments(prev => [...prev, c]); setNewComment('');
  }

  async function handlePickFile() {
    if (!selected) return;
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    const dest = FileSystem.documentDirectory + generateId() + '_' + asset.name;
    await FileSystem.copyAsync({ from: asset.uri, to: dest });
    const att = { id: generateId(), noteId: null, taskId: selected.id, name: asset.name, type: asset.mimeType, uri: dest, size: asset.size || 0 };
    await addAttachment(att); setAtts(a => [...a, att]);
  }

  const filtered = tasks.filter(t => filter === 'all' || t.status === filter);

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Tasks"
        subtitle={`${tasks.filter(t => t.status !== 'done').length} active`}
        right={<Btn label="+ New" onPress={() => setShowNew(true)} color={COLORS.accent} small />}
      />

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 8 }}>
        {['all', 'pending', 'in-progress', 'done'].map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)}
            style={[s.chip, filter === f && s.chipActive]}>
            <Text style={{ color: filter === f ? COLORS.accent : COLORS.textMuted, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
              {f === 'all' ? '📋 All' : f === 'pending' ? '⏳ Pending' : f === 'in-progress' ? '🔄 In Progress' : '✅ Done'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <Empty icon="✅" title="No tasks" subtitle="Tap + New to add a task" action={() => setShowNew(true)} actionLabel="New Task" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item: task }) => {
            const overdue = isOverdue(task.due_date, task.due_time) && task.status !== 'done';
            return (
              <TouchableOpacity activeOpacity={0.85} onPress={() => openTask(task)}
                style={[s.taskCard, SHADOW, overdue && { borderColor: COLORS.accent2 + '55' }]}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <TouchableOpacity onPress={() => handleStatusToggle(task)} style={{ marginTop: 2 }}>
                    <View style={[s.circle, { borderColor: STATUS_COLORS[task.status], backgroundColor: task.status === 'done' ? STATUS_COLORS.done : 'transparent' }]}>
                      {task.status === 'done' && <Text style={{ fontSize: 9, color: '#fff' }}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.taskTitle, task.status === 'done' && s.strikethrough]}>{task.title}</Text>
                    {task.description?.length > 0 && (
                      <Text style={s.taskDesc} numberOfLines={1}>{task.description}</Text>
                    )}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6, alignItems: 'center' }}>
                      <Badge label={task.priority} color={PRIORITY_COLORS[task.priority]} />
                      {task.repeat !== 'none' && <Badge label={`↻ ${task.repeat}`} color={COLORS.warning} />}
                      {task.due_date && (
                        <Text style={{ fontSize: 10, color: overdue ? COLORS.accent2 : COLORS.textMuted }}>
                          📅 {formatDateTime(task.due_date, task.due_time)}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── New Task Modal ── */}
      <Modal visible={showNew} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setShowNew(false)}>
          <ScrollView style={s.sheet} keyboardShouldPersistTaps="handled">
            <Text style={s.sheetTitle}>New Task</Text>
            <Input label="Title" value={draft.title} onChangeText={v => setDraft(d => ({ ...d, title: v }))} placeholder="What needs to be done?" />
            <Input label="Description" value={draft.description} onChangeText={v => setDraft(d => ({ ...d, description: v }))} placeholder="Optional details..." multiline numberOfLines={3} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input label="Due Date (YYYY-MM-DD)" value={draft.dueDate} onChangeText={v => setDraft(d => ({ ...d, dueDate: v }))} placeholder="2025-12-31" />
              </View>
              <View style={{ flex: 1 }}>
                <Input label="Due Time (HH:MM)" value={draft.dueTime} onChangeText={v => setDraft(d => ({ ...d, dueTime: v }))} placeholder="09:00" />
              </View>
            </View>
            <Select label="Priority" value={draft.priority} onChange={v => setDraft(d => ({ ...d, priority: v }))} options={PRIORITY_OPTS} />
            <Select label="Repeat Reminder" value={draft.repeat} onChange={v => setDraft(d => ({ ...d, repeat: v }))} options={REPEAT_OPTS} />
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 32 }}>
              <Btn label="Cancel" onPress={() => setShowNew(false)} variant="outline" color={COLORS.textMuted} style={{ flex: 1 }} />
              <Btn label="Create Task" onPress={handleCreate} color={COLORS.accent} style={{ flex: 1 }} disabled={!draft.title.trim()} />
            </View>
          </ScrollView>
        </Pressable>
      </Modal>

      {/* ── Task Detail Modal ── */}
      <Modal visible={!!selected} transparent animationType="slide">
        <Pressable style={s.overlay} onPress={() => setSelected(null)}>
          <ScrollView style={[s.sheet, { maxHeight: '90%' }]} keyboardShouldPersistTaps="handled">
            {selected && <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[s.sheetTitle, { flex: 1 }]}>{selected.title}</Text>
                <TouchableOpacity onPress={() => handleDelete(selected)}>
                  <Text style={{ color: COLORS.accent2, fontSize: 20 }}>🗑</Text>
                </TouchableOpacity>
              </View>
              {selected.description ? <Text style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 12 }}>{selected.description}</Text> : null}
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                <Badge label={selected.priority} color={PRIORITY_COLORS[selected.priority]} />
                <Badge label={selected.status} color={STATUS_COLORS[selected.status]} />
                {selected.repeat !== 'none' && <Badge label={`↻ ${selected.repeat}`} color={COLORS.warning} />}
                {selected.due_date && <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>📅 {formatDateTime(selected.due_date, selected.due_time)}</Text>}
              </View>

              <Btn
                label={selected.status === 'done' ? '↩ Mark Pending' : '✅ Mark Done'}
                onPress={() => handleStatusToggle(selected)}
                color={selected.status === 'done' ? COLORS.textMuted : COLORS.accent3}
                variant="outline"
                style={{ marginBottom: 14 }}
              />

              <Divider />

              {/* Attachments */}
              <View style={{ marginVertical: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={s.sectionLabel}>ATTACHMENTS ({attachments.length})</Text>
                  <Btn label="+ File" onPress={handlePickFile} small variant="outline" color={COLORS.accent} />
                </View>
                {attachments.map(att => (
                  <View key={att.id} style={s.attRow}>
                    <Text>{att.type?.includes('pdf') ? '📄' : '📎'}</Text>
                    <Text style={{ flex: 1, color: COLORS.text, fontSize: 12 }} numberOfLines={1}>{att.name}</Text>
                    <TouchableOpacity onPress={async () => { await deleteAttachment(att.id); setAtts(a => a.filter(x => x.id !== att.id)); }}>
                      <Text style={{ color: COLORS.accent2 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <Divider />

              {/* Comments */}
              <View style={{ marginTop: 10 }}>
                <Text style={[s.sectionLabel, { marginBottom: 8 }]}>COMMENTS ({comments.length})</Text>
                {comments.map(c => (
                  <View key={c.id} style={s.commentRow}>
                    <Text style={{ color: COLORS.text, fontSize: 13, flex: 1 }}>{c.text}</Text>
                    <TouchableOpacity onPress={async () => { await deleteComment(c.id); setComments(cs => cs.filter(x => x.id !== c.id)); }}>
                      <Text style={{ color: COLORS.textDim, fontSize: 14 }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 32 }}>
                  <TextInput
                    value={newComment} onChangeText={setNewComment}
                    placeholder="Add a comment..." placeholderTextColor={COLORS.textDim}
                    style={s.commentInput} onSubmitEditing={handleAddComment}
                  />
                  <Btn label="Add" onPress={handleAddComment} color={COLORS.accent} small />
                </View>
              </View>
            </>}
          </ScrollView>
        </Pressable>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  chipActive: { backgroundColor: COLORS.accent + '22', borderColor: COLORS.accent + '55' },
  taskCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 8 },
  taskTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
  taskDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  strikethrough: { textDecorationLine: 'line-through', color: COLORS.textDim },
  circle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: 24 },
  sheetTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  attRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, padding: 8, marginBottom: 4 },
  commentRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: RADIUS.sm, padding: 10, marginBottom: 4 },
  commentInput: { flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.sm, color: COLORS.text, padding: 8, fontSize: 13 },
});
