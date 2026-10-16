import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as db from './db';
import { dayKey, today } from './dates';

/** Write a backup file and open the share sheet so the user can save it to Files, iCloud Drive, Google Drive or email. */
export async function shareBackup() {
  const file = new File(Paths.cache, `SITREP-backup-${dayKey(today())}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(db.exportBackup()));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your SITREP backup' });
}

/** Let the user pick a backup file and return its parsed contents, or null if they cancelled. */
export async function pickBackup(): Promise<unknown | null> {
  const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['application/json', 'text/plain', '*/*'] });
  if (r.canceled || !r.assets?.[0]) return null;
  const text = await new File(r.assets[0].uri).text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('This file is not a SITREP backup.');
  }
}
