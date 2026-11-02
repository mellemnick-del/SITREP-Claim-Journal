import React, { useState } from 'react';
import { Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import * as db from '../db';
import { useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { useToast } from '../Toast';
import { Body, Button, Chip, Choice, Field, Fine, H2, Header, Input, Panel, Row, Screen, Stats, Strong, Tone } from '../ui';

const tone = (st: db.EvidenceStatus): Tone => (st === 'Have' ? 'ok' : st === 'Requested' ? 'warn' : 'flare');
const next = (st: db.EvidenceStatus) => db.EVIDENCE_STATUSES[(db.EVIDENCE_STATUSES.indexOf(st) + 1) % db.EVIDENCE_STATUSES.length];

/** Copy a picked file into the app's private documents folder so it survives cache cleanup. */
async function keepFile(uri: string, name: string): Promise<string> {
  const dir = new Directory(Paths.document, 'evidence');
  dir.create({ idempotent: true });
  const dest = new File(dir, `${Date.now()}-${name.replace(/[^\w.\- ]/g, '_')}`);
  await new File(uri).copy(dest);
  return dest.uri;
}

function removeFile(uri: string | null) {
  if (!uri) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // The file is already gone; nothing to clean up.
  }
}

export default function EvidenceScreen() {
  const s = useStore();
  const p = usePalette();
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(null);

  const groups: { id: number | null; name: string }[] = [{ id: null, name: 'Applies to every condition' }, ...s.conditions.map(c => ({ id: c.id, name: c.name }))];
  const count = (st: db.EvidenceStatus) => s.evidence.filter(e => e.status === st).length;

  return (
    <Screen>
      <Header eyebrow="Evidence locker" title="Evidence" />
      <Stats
        items={[
          { value: String(count('Have')), label: 'in hand' },
          { value: String(count('Requested')), label: 'requested' },
          { value: String(count('Need')), label: 'still needed' },
        ]}
      />
      <Fine>Tap a status to move it along: Need, then Requested, then Have. Tap an item for more options.</Fine>
      {groups.map(g => {
        const items = s.evidence.filter(e => e.conditionId === g.id);
        if (!items.length) return null;
        return (
          <Panel key={String(g.id)} style={{ gap: 0 }}>
            <H2 style={{ marginBottom: 10 }}>{g.name}</H2>
            {items.map((e, i) => (
              <View key={e.id} style={[{ paddingVertical: 12, gap: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: p.line }]}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <Text style={{ flex: 1 }} onPress={() => setOpen(open === e.id ? null : e.id)} accessibilityRole="button">
                    <Strong>{e.title}</Strong>
                    {'\n'}
                    <Text style={{ fontFamily: fonts.body, fontSize: 13, color: p.muted }}>
                      {e.type}
                      {e.fileName ? `  ·  ${e.fileName}` : ''}
                    </Text>
                  </Text>
                  <Chip
                    label={e.status}
                    tone={tone(e.status)}
                    onPress={() => {
                      const st = next(e.status);
                      s.write(() => db.setEvidenceStatus(e.id, st));
                      toast(`Marked as ${st}`);
                    }}
                  />
                </Row>
                {open === e.id && (
                  <Row style={{ gap: 8 }}>
                    {e.fileUri && <Button kind="ghost" label="Open or share file" onPress={() => Sharing.shareAsync(e.fileUri!)} />}
                    <Button
                      kind="danger"
                      label="Delete"
                      onPress={() => {
                        removeFile(e.fileUri);
                        s.write(() => db.deleteEvidence(e.id));
                        setOpen(null);
                        toast('Evidence deleted');
                      }}
                    />
                  </Row>
                )}
              </View>
            ))}
          </Panel>
        );
      })}
      <AddEvidence />
    </Screen>
  );
}

function AddEvidence() {
  const s = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [type, setType] = useState(db.EVIDENCE_TYPES[0]);
  const [cond, setCond] = useState<number>(0); // 0 = all conditions
  const [file, setFile] = useState<{ uri: string; name: string } | null>(null);

  const pick = async () => {
    const r = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['application/pdf', 'image/*'] });
    if (r.canceled || !r.assets?.[0]) return;
    setFile({ uri: r.assets[0].uri, name: r.assets[0].name });
    if (!title) setTitle(r.assets[0].name.replace(/\.[^.]+$/, ''));
  };

  const save = async () => {
    if (!title.trim()) {
      toast('Give the evidence a name first');
      return;
    }
    try {
      const stored = file ? await keepFile(file.uri, file.name) : null;
      s.write(() =>
        db.addEvidence({ title: title.trim(), type, conditionId: cond || null, status: stored ? 'Have' : 'Need', fileUri: stored, fileName: file?.name ?? null }),
      );
      setTitle('');
      setFile(null);
      toast('Added to your evidence locker');
    } catch {
      toast("Couldn't save that file. Try picking it again.");
    }
  };

  return (
    <Panel>
      <H2>Add evidence</H2>
      <Field label="What is it?">
        <Input value={title} onChangeText={setTitle} placeholder="Example: Urgent care visit for back, March 2026" />
      </Field>
      <Field label="Condition">
        <Choice options={[{ value: 0, label: 'All conditions' }, ...s.conditions.map(c => ({ value: c.id, label: c.name }))]} value={cond} onChange={setCond} />
      </Field>
      <Field label="Type">
        <Choice options={db.EVIDENCE_TYPES.map(t => ({ value: t, label: t }))} value={type} onChange={setType} />
      </Field>
      <Field label="File (optional)">
        {file ? (
          <Row>
            <Body style={{ flex: 1 }}>{file.name}</Body>
            <Chip label="Remove" onPress={() => setFile(null)} />
          </Row>
        ) : (
          <Button kind="ghost" label="Attach a PDF or photo" onPress={pick} />
        )}
      </Field>
      <Button label="Add to locker" onPress={save} />
      <Fine>Files are copied into SITREP's private storage on this phone. They aren't uploaded anywhere.</Fine>
    </Panel>
  );
}
