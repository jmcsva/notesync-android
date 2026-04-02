import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';
import { getSetting, setSetting, getAllNotebooks, getAllTasks, getNotesByNotebook } from '../utils/database';
import { getSyncProvider, setSyncProvider, getToken, saveToken, clearToken, syncData } from '../utils/cloudSync';
import { Btn, ScreenHeader, Divider, Card } from '../components/UI';

const PROVIDERS = [
  {
    id: 'local', label: 'Local Only', icon: '💾',
    desc: 'Stored on this device. No sync.', color: '#888',
  },
  {
    id: 'gdrive', label: 'Google Drive', icon: '🟢',
    desc: 'Auto-sync to your Google Drive. Free 15 GB.', color: '#34A853',
    authUrl: 'https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/drive.file&response_type=token',
  },
  {
    id: 'onedrive', label: 'OneDrive', icon: '🔵',
    desc: 'Auto-sync to your Microsoft OneDrive. Free 5 GB.', color: '#0078D4',
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?scope=files.readwrite&response_type=token',
  },
];

export default function SettingsScreen() {
  const [provider, setProvider]   = useState('local');
  const [syncing, setSyncing]     = useState(false);
  const [lastSync, setLastSync]   = useState(null);
  const [noteCount, setNoteCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    const p  = await getSyncProvider() || 'local';
    const ls = await getSetting('last_sync');
    setProvider(p); setLastSync(ls ? parseInt(ls) : null);

    const nbs = await getAllNotebooks();
    let nc = 0;
    for (const nb of nbs) { const ns = await getNotesByNotebook(nb.id); nc += ns.length; }
    const tasks = await getAllTasks();
    setNoteCount(nc); setTaskCount(tasks.length);
  }

  async function handleSelectProvider(p) {
    if (p === provider) return;
    if (p === 'local') {
      await setSyncProvider('local'); setProvider('local'); return;
    }
    Alert.alert(
      `Connect ${p === 'gdrive' ? 'Google Drive' : 'OneDrive'}`,
      `This will open your browser to sign in. After signing in, paste your access token here (for production, use OAuth SDK).`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Connect', onPress: async () => {
          await setSyncProvider(p); setProvider(p);
          Alert.alert('Connected!', `${p === 'gdrive' ? 'Google Drive' : 'OneDrive'} is now set as your sync provider. Tap "Sync Now" to upload your data.`);
        }},
      ]
    );
  }

  async function handleSync() {
    if (provider === 'local') {
      Alert.alert('No cloud provider', 'Select Google Drive or OneDrive to enable sync.');
      return;
    }
    const token = await getToken(provider);
    if (!token) {
      Alert.alert('Not authenticated', 'Please connect your cloud account first.');
      return;
    }
    setSyncing(true);
    try {
      const nbs    = await getAllNotebooks();
      const tasks  = await getAllTasks();
      const notesAll = [];
      for (const nb of nbs) { const ns = await getNotesByNotebook(nb.id); notesAll.push(...ns); }

      await syncData(provider, token.access_token, { notebooks: nbs, notes: notesAll, tasks });
      const now = Date.now();
      await setSetting('last_sync', String(now)); setLastSync(now);
      Alert.alert('Sync complete ✓', 'Your data has been uploaded to ' + (provider === 'gdrive' ? 'Google Drive' : 'OneDrive'));
    } catch (e) {
      Alert.alert('Sync failed', e.message);
    }
    setSyncing(false);
  }

  return (
    <ScrollView style={s.screen}>
      <ScreenHeader title="Settings" subtitle="Storage & Sync" />

      {/* Stats */}
      <View style={s.statsRow}>
        {[
          { label: 'Notes', val: noteCount, icon: '📝' },
          { label: 'Tasks', val: taskCount, icon: '✅' },
          { label: 'Last sync', val: lastSync ? new Date(lastSync).toLocaleDateString('en-IN') : 'Never', icon: '🔄' },
        ].map(st => (
          <View key={st.label} style={s.statCard}>
            <Text style={{ fontSize: 22 }}>{st.icon}</Text>
            <Text style={{ color: COLORS.text, fontWeight: '800', fontSize: 18 }}>{st.val}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>{st.label}</Text>
          </View>
        ))}
      </View>

      {/* Storage providers */}
      <Text style={s.sectionLabel}>STORAGE & SYNC</Text>
      {PROVIDERS.map(p => (
        <TouchableOpacity key={p.id} onPress={() => handleSelectProvider(p.id)}
          style={[s.providerCard, provider === p.id && { borderColor: p.color, backgroundColor: p.color + '10' }, SHADOW]}>
          <Text style={{ fontSize: 24 }}>{p.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: COLORS.text, fontWeight: '700', fontSize: 15 }}>{p.label}</Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{p.desc}</Text>
          </View>
          {provider === p.id && <Text style={{ color: p.color, fontSize: 20 }}>✓</Text>}
        </TouchableOpacity>
      ))}

      {provider !== 'local' && (
        <Btn
          label={syncing ? 'Syncing…' : '🔄 Sync Now'}
          onPress={handleSync}
          disabled={syncing}
          color={COLORS.accent}
          style={{ marginHorizontal: 12, marginTop: 8 }}
        />
      )}

      <Divider style={{ margin: 16 }} />

      {/* Info box */}
      <View style={s.infoBox}>
        <Text style={{ color: COLORS.accent, fontWeight: '800', marginBottom: 6 }}>📡 Cross-Device Sync</Text>
        <Text style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 20 }}>
          Install NoteSync on your Windows PC and Android device. Sign in to the same Google Drive or OneDrive account on both. Your notes, notebooks, tasks, and attachments sync automatically.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  statsRow: { flexDirection: 'row', gap: 10, padding: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 12, alignItems: 'center', gap: 4 },
  sectionLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  providerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginHorizontal: 12, marginBottom: 8 },
  infoBox: { margin: 12, backgroundColor: COLORS.surface2, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.accent + '33', padding: 16 },
});
