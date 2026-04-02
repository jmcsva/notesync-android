/**
 * Cloud Sync Utility
 * Handles Google Drive and OneDrive sync for NoteSync Android
 *
 * To enable:
 *  - Google Drive: Set up OAuth2 in Google Cloud Console, add client ID to env
 *  - OneDrive: Register app in Azure AD, add client ID to env
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const SYNC_FOLDER = 'NoteSync';
const SYNC_KEY = 'sync_provider';
const TOKEN_KEY = 'sync_token';

// ── AUTH TOKENS ────────────────────────────────────────────
export async function saveToken(provider, token) {
  await AsyncStorage.setItem(`${TOKEN_KEY}_${provider}`, JSON.stringify(token));
}

export async function getToken(provider) {
  const raw = await AsyncStorage.getItem(`${TOKEN_KEY}_${provider}`);
  return raw ? JSON.parse(raw) : null;
}

export async function clearToken(provider) {
  await AsyncStorage.removeItem(`${TOKEN_KEY}_${provider}`);
}

export async function getSyncProvider() {
  return AsyncStorage.getItem(SYNC_KEY);
}

export async function setSyncProvider(provider) {
  await AsyncStorage.setItem(SYNC_KEY, provider);
}

// ── GOOGLE DRIVE ───────────────────────────────────────────
const GDRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
const GDRIVE_FILES  = 'https://www.googleapis.com/drive/v3/files';

async function gdriveGetFolderId(token) {
  const res = await fetch(
    `${GDRIVE_FILES}?q=name='${SYNC_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.files && data.files.length > 0) return data.files[0].id;

  // Create folder
  const create = await fetch(GDRIVE_FILES, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: SYNC_FOLDER, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const folder = await create.json();
  return folder.id;
}

export async function uploadToGDrive(token, filename, content) {
  const folderId = await gdriveGetFolderId(token);

  // Check if file exists
  const search = await fetch(
    `${GDRIVE_FILES}?q=name='${filename}' and '${folderId}' in parents and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const found = await search.json();

  const meta = JSON.stringify({ name: filename, parents: found.files?.length ? undefined : [folderId] });
  const body = `--boundary\r\nContent-Type: application/json\r\n\r\n${meta}\r\n--boundary\r\nContent-Type: application/json\r\n\r\n${content}\r\n--boundary--`;

  const url = found.files?.length
    ? `${GDRIVE_UPLOAD}/${found.files[0].id}?uploadType=multipart`
    : `${GDRIVE_UPLOAD}?uploadType=multipart`;

  const method = found.files?.length ? 'PATCH' : 'POST';

  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/related; boundary=boundary' },
    body,
  });
}

export async function downloadFromGDrive(token, filename) {
  const folderId = await gdriveGetFolderId(token);
  const search = await fetch(
    `${GDRIVE_FILES}?q=name='${filename}' and '${folderId}' in parents and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const found = await search.json();
  if (!found.files?.length) return null;

  const res = await fetch(`${GDRIVE_FILES}/${found.files[0].id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.text();
}

// ── ONEDRIVE ───────────────────────────────────────────────
const ONEDRIVE_BASE = 'https://graph.microsoft.com/v1.0/me/drive/root';

export async function uploadToOneDrive(token, filename, content) {
  return fetch(
    `${ONEDRIVE_BASE}:/${SYNC_FOLDER}/${filename}:/content`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: content,
    }
  );
}

export async function downloadFromOneDrive(token, filename) {
  const meta = await fetch(
    `${ONEDRIVE_BASE}:/${SYNC_FOLDER}/${filename}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!meta.ok) return null;
  const data = await meta.json();

  const content = await fetch(data['@microsoft.graph.downloadUrl']);
  return content.text();
}

// ── UNIFIED SYNC ───────────────────────────────────────────
export async function syncData(provider, token, payload) {
  const content = JSON.stringify({ ...payload, syncedAt: Date.now() });
  if (provider === 'gdrive') return uploadToGDrive(token, 'notesync_data.json', content);
  if (provider === 'onedrive') return uploadToOneDrive(token, 'notesync_data.json', content);
}

export async function fetchSyncData(provider, token) {
  let raw;
  if (provider === 'gdrive') raw = await downloadFromGDrive(token, 'notesync_data.json');
  if (provider === 'onedrive') raw = await downloadFromOneDrive(token, 'notesync_data.json');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
