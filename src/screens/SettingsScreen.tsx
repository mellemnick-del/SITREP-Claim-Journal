import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Directory, Paths } from 'expo-file-system';
import * as db from '../db';
import { pickBackup, shareBackup } from '../backup';
import { biometricsAvailable, confirmIdentity } from '../Lock';
import { cancelReminders, scheduleDailyReminder } from '../reminders';
import { useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { useToast } from '../Toast';
import { DateField } from '../DateField';
import { Body, Button, Fine, H2, Panel, Row, Screen, Header, Strong } from '../ui';

function SwitchRow({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  const p = usePalette();
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Strong>{title}</Strong>
        <Body small muted>{detail}</Body>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: p.accent, false: p.line }} thumbColor={p.surface} />
    </Row>
  );
}

export default function SettingsScreen() {
  const s = useStore();
  const p = usePalette();
  const toast = useToast();

  const [remind, setRemind] = useState(() => db.getMeta('reminder') !== null);
  const [time, setTime] = useState(() => {
    const [h, m] = (db.getMeta('reminder') ?? '20:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  });
  const [lock, setLock] = useState(() => db.getMeta('lock') === '1');
  const [canLock, setCanLock] = useState(true);
  const [confirm, setConfirm] = useState<null | 'erase' | 'restore'>(null);
  const [pending, setPending] = useState<unknown>(null);

  useEffect(() => {
    biometricsAvailable().then(setCanLock);
  }, []);

  const applyReminder = async (on: boolean, at: Date) => {
    if (!on) {
      await cancelReminders();
      s.write(() => db.deleteMeta('reminder'));
      setRemind(false);
      return;
    }
    const ok = await scheduleDailyReminder(at.getHours(), at.getMinutes());
    if (!ok) {
      setRemind(false);
      toast('Allow notifications for SITREP in your phone settings first');
      return;
    }
    s.write(() => db.setMeta('reminder', `${at.getHours()}:${at.getMinutes()}`));
    setRemind(true);
    toast(`Reminder set for ${at.getHours() % 12 || 12}:${String(at.getMinutes()).padStart(2, '0')} ${at.getHours() < 12 ? 'AM' : 'PM'}`);
  };

  const toggleLock = async (on: boolean) => {
    if (!(await confirmIdentity(on ? 'Turn on app lock' : 'Turn off app lock'))) return;
    s.write(() => db.setMeta('lock', on ? '1' : '0'));
    setLock(on);
    toast(on ? 'App lock on' : 'App lock off');
  };

  return (
    <Screen underHeader>
      <Header eyebrow="SITREP" title="Settings" />

      <Panel>
        <H2>Daily reminder</H2>
        <SwitchRow title="Remind me to check in" detail="One notification a day. People who log daily build much stronger records." value={remind} onChange={v => applyReminder(v, time)} />
        {remind && (
          <Row style={{ justifyContent: 'space-between' }}>
            <Body>Time</Body>
            <DateField
              mode="time"
              value={time}
              onChange={d => {
                setTime(d);
                applyReminder(true, d);
              }}
            />
          </Row>
        )}
      </Panel>

      <Panel>
        <H2>Privacy</H2>
        {canLock ? (
          <SwitchRow title="Lock with Face ID or passcode" detail="Ask to unlock every time SITREP opens." value={lock} onChange={toggleLock} />
        ) : (
          <Body small muted>Set up Face ID, Touch ID, fingerprint or a passcode on your phone to lock SITREP.</Body>
        )}
        <Body small muted>Your journal is stored only on this phone. There's no account and nothing is uploaded.</Body>
      </Panel>

      <Panel>
        <H2>Backup</H2>
        <Body small muted>
          Save a backup file to iCloud Drive, Google Drive, Files or email. Restore it on a new phone so you never lose months of logs. Attached
          evidence files aren't included, only their records.
        </Body>
        <Button
          label="Save a backup"
          onPress={async () => {
            try {
              await shareBackup();
            } catch {
              toast("Couldn't create the backup. Try again.");
            }
          }}
        />
        {confirm === 'restore' ? (
          <View style={{ gap: 8 }}>
            <Body small>Restoring replaces everything on this phone with the backup. Anything not in the backup will be lost.</Body>
            <Row style={{ gap: 8 }}>
              <Button kind="ghost" label="Cancel" onPress={() => { setConfirm(null); setPending(null); }} />
              <Button
                kind="danger"
                label="Replace with backup"
                onPress={() => {
                  try {
                    s.write(() => db.importBackup(pending));
                    toast('Backup restored');
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Couldn't restore that backup");
                  }
                  setConfirm(null);
                  setPending(null);
                }}
              />
            </Row>
          </View>
        ) : (
          <Button
            kind="ghost"
            label="Restore from a backup"
            onPress={async () => {
              try {
                const data = await pickBackup();
                if (!data) return;
                setPending(data);
                setConfirm('restore');
              } catch (e) {
                toast(e instanceof Error ? e.message : "Couldn't read that file");
              }
            }}
          />
        )}
      </Panel>

      <Panel>
        <H2>Your data</H2>
        {s.isExample && <Body small>You're looking at example data. Erase it when you're ready to start your real journal.</Body>}
        {confirm === 'erase' ? (
          <View style={{ gap: 8 }}>
            <Body small>This permanently deletes every check-in, flare-up, check-up, condition, date and evidence file. It can't be undone.</Body>
            <Row style={{ gap: 8 }}>
              <Button kind="ghost" label="Keep my data" onPress={() => setConfirm(null)} />
              <Button
                kind="danger"
                label="Erase everything"
                onPress={async () => {
                  try {
                    const dir = new Directory(Paths.document, 'evidence');
                    if (dir.exists) dir.delete();
                  } catch {
                    // No evidence folder yet.
                  }
                  await cancelReminders();
                  s.write(() => db.eraseEverything());
                  toast('All data erased');
                }}
              />
            </Row>
          </View>
        ) : (
          <Text onPress={() => setConfirm('erase')} accessibilityRole="button" style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: p.flare }}>
            Erase all data
          </Text>
        )}
      </Panel>

      <Panel>
        <H2>About</H2>
        <Body small muted>
          SITREP is an organizer for veterans preparing a VA disability claim. It isn't legal or medical advice and isn't affiliated with the
          Department of Veterans Affairs. For help with your claim, work with an accredited Veterans Service Officer (VSO).
        </Body>
        <Fine>Version {Constants.expoConfig?.version ?? '1.0.0'}</Fine>
      </Panel>
    </Screen>
  );
}
