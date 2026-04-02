import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export async function exportNoteToPDF(note, notebook) {
  const tagsHtml = (JSON.parse(note.tags || '[]'))
    .map(t => `<span class="tag">${t}</span>`).join('');

  const contentHtml = (note.content || '')
    .split('\n')
    .map(line => `<p>${line || '&nbsp;'}</p>`)
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; background: #fff; color: #1a1a1a; padding: 48px; }
        .header { border-bottom: 3px solid #4F7CFF; padding-bottom: 20px; margin-bottom: 28px; }
        .notebook { font-size: 12px; color: #4F7CFF; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
        h1 { font-size: 28px; color: #0a0a18; margin-bottom: 8px; }
        .meta { font-size: 12px; color: #888; }
        .tags { margin: 16px 0; }
        .tag { display: inline-block; background: #4F7CFF22; color: #4F7CFF; border: 1px solid #4F7CFF55; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: bold; margin-right: 6px; }
        .content { font-size: 15px; line-height: 1.8; color: #2a2a2a; }
        .content p { margin-bottom: 10px; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #eee; font-size: 11px; color: #bbb; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="notebook">${notebook?.icon || '📓'} ${notebook?.name || 'Notebook'}</div>
        <h1>${note.title || 'Untitled Note'}</h1>
        <div class="meta">Created ${new Date(note.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} &nbsp;·&nbsp; Last updated ${new Date(note.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
      <div class="content">${contentHtml}</div>
      <div class="footer">Exported from NoteSync · ${new Date().toLocaleString('en-IN')}</div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  // Move to a shareable location
  const dest = FileSystem.documentDirectory + `${note.title?.replace(/[^a-z0-9]/gi, '_') || 'note'}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Export Note as PDF' });
  }

  return dest;
}
