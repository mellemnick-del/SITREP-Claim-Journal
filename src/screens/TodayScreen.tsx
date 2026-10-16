import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import * as db from '../db';
import { addDays, dayKey, daysUntil, fmtFull, fmtLong, fromDayKey, hhmm, today } from '../dates';
import { daysLogged, streak, useStore, windowStart } from '../store';
import { fonts, usePalette } from '../theme';
import { useToast } from '../Toast';
import { DateField } from '../DateField';
import { Body, Button, Check, Choice, Field, Fine, H2, Header, Input, Mono, Panel, Row, Screen, Stats, Stepper, Chip, Strong } from '../ui';

export default function TodayScreen() {
  const s = useStore();
  const p = usePalette();
  const toast = useToast();
  const key = dayKey(today());
  const existing = s.checkins[key];

  const [sev, setSev] = useState<Record<number, number>>({});
  const [sleep, setSleep] = useState(7);
  const [limited, setLimited] = useState(false);
  const [note, setNote] = useState('');
  const [flareOpen, setFlareOpen] = useState(false);
  const [deadlineOpen, setDeadlineOpen] = useState(false);

  // Start from today's saved check-in if there is one, and make sure every condition has a value.
  useEffect(() => {
    const base = existing?.severity ?? {};
    setSev(prev => Object.fromEntries(s.conditions.map(c => [c.id, base[c.id] ?? prev[c.id] ?? 0])));
    if (existing) {
      setSleep(existing.sleep ?? 7);
      setLimited(existing.limited);
      setNote(existing.note);
    }
  }, [existing?.savedAt, s.conditions]);

  const save = () => {
    s.write(() => db.saveCheckIn({ day: key, sleep, limited, note: note.trim(), severity: sev }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast(existing ? 'Check-in updated' : 'Check-in saved');
  };

  const flares30 = s.flares.filter(f => f.start >= windowStart()).length;
  const upcoming = s.deadlines.filter(d => daysUntil(fromDayKey(d.date)) >= 0);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: 2.4, color: p.fg }}>
          SIT<Text style={{ color: p.accent }}>REP</Text>
        </Text>
        {s.isExample && <Chip label="Example data" tone="warn" />}
      </Row>
      <Header eyebrow={fmtLong(today())} title={existing ? "You're logged for today" : "Today's check-in"} />
      <Stats
        items={[
          { value: String(streak(s)), label: 'day streak' },
          { value: `${daysLogged(s)}/30`, label: 'days logged' },
          { value: String(flares30), label: 'flare-ups, 30 days' },
        ]}
      />

      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>Coming up</H2>
          {!deadlineOpen && <Chip label="Add date" tone="accent" onPress={() => setDeadlineOpen(true)} />}
        </Row>
        {deadlineOpen && <DeadlineForm onDone={() => setDeadlineOpen(false)} />}
        {upcoming.length === 0 && !deadlineOpen && (
          <Body muted small>Add your C&P exam, VSO appointments, or when your Intent to File expires.</Body>
        )}
        {upcoming.map(d => {
          const date = fromDayKey(d.date);
          const n = daysUntil(date);
          const soon = n <= 14;
          return (
            <Row key={d.id} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 56, borderRadius: 8, paddingVertical: 6, alignItems: 'center', backgroundColor: soon ? p.warnSoft : p.sunken }}>
                <Text style={{ fontFamily: fonts.display, fontSize: 22, lineHeight: 24, color: soon ? p.warn : p.fg }}>{n}</Text>
                <Text style={{ fontFamily: fonts.bodySemi, fontSize: 10, letterSpacing: 0.8, color: soon ? p.warn : p.muted }}>{n === 1 ? 'DAY' : 'DAYS'}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Strong>{d.title}</Strong>
                {!!d.detail && <Body small muted>{d.detail}</Body>}
                <Row style={{ justifyContent: 'space-between' }}>
                  <Mono>{fmtFull(date)}</Mono>
                  <Text
                    onPress={() => s.write(() => db.deleteDeadline(d.id))}
                    accessibilityRole="button"
                    style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: p.muted }}
                  >
                    Remove
                  </Text>
                </Row>
              </View>
            </Row>
          );
        })}
      </Panel>

      {flareOpen && <FlareForm onDone={() => setFlareOpen(false)} />}

      <Panel>
        <Row style={{ justifyContent: 'space-between' }}>
          <H2>{existing ? "Update today's check-in" : 'How was today?'}</H2>
          {existing && <Chip label={`Logged ${hhmm(new Date(existing.savedAt))}`} tone="ok" />}
        </Row>
        {s.conditions.length === 0 ? (
          <Body muted>Add the conditions you're claiming on the Conditions tab, then rate them here each day.</Body>
        ) : (
          <>
            <Fine>Rate each condition from 0 (none) to 10 (worst). Takes about a minute.</Fine>
            {s.conditions.map(c => {
              const v = sev[c.id] ?? 0;
              return (
                <View key={c.id} style={{ gap: 2 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Strong>{c.name}</Strong>
                    {!!c.dc && <Mono>DC {c.dc}</Mono>}
                  </Row>
                  <Row>
                    <Slider
                      style={{ flex: 1, height: 40 }}
                      minimumValue={0}
                      maximumValue={10}
                      step={1}
                      value={v}
                      onValueChange={x => setSev(prev => ({ ...prev, [c.id]: Math.round(x) }))}
                      minimumTrackTintColor={v >= 7 ? p.flare : p.accent}
                      maximumTrackTintColor={p.line}
                      thumbTintColor={v >= 7 ? p.flare : p.accent}
                      accessibilityLabel={`${c.name} severity`}
                    />
                    <Text style={{ width: 32, textAlign: 'right', fontFamily: fonts.display, fontSize: 24, color: v >= 7 ? p.flare : p.fg }}>{v}</Text>
                  </Row>
                </View>
              );
            })}
          </>
        )}
        <Field label="Hours of sleep last night">
          <Stepper value={sleep} onChange={setSleep} step={0.5} max={16} suffix="hrs" />
        </Field>
        <Check label="Symptoms limited my work or daily tasks today" value={limited} onChange={setLimited} />
        <Field label="What happened? (optional)">
          <Input multiline value={note} onChangeText={setNote} placeholder="Example: Had to leave the grocery store, back wouldn't let me stand in line" />
        </Field>
        <Row style={{ flexWrap: 'wrap', gap: 8 }}>
          {!flareOpen && s.conditions.length > 0 && <Button kind="flare" label="Log flare-up" onPress={() => setFlareOpen(true)} />}
          <Button label={existing ? 'Update check-in' : 'Save check-in'} onPress={save} />
        </Row>
      </Panel>
      <Fine>
        SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA. Talk with an accredited VSO about
        your claim. Everything you enter stays on this phone.
      </Fine>
    </Screen>
  );
}

function FlareForm({ onDone }: { onDone: () => void }) {
  const s = useStore();
  const toast = useToast();
  const [cond, setCond] = useState(s.conditions[0]?.id ?? 0);
  const [hoursAgo, setHoursAgo] = useState(0);
  const [hours, setHours] = useState(4);
  const [liedDown, setLiedDown] = useState(false);
  const [note, setNote] = useState('');

  const save = () => {
    s.write(() => db.addFlare({ conditionId: cond, start: Date.now() - hoursAgo * 3_600_000, hours, liedDown, note: note.trim() }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast(`${s.conditions.find(c => c.id === cond)?.name ?? 'Flare-up'} flare-up saved`);
    onDone();
  };

  return (
    <Panel>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2>Log a flare-up</H2>
        <Chip label="Flare-up" tone="flare" />
      </Row>
      <Field label="Condition">
        <Choice options={s.conditions.map(c => ({ value: c.id, label: c.name }))} value={cond} onChange={setCond} />
      </Field>
      <Field label="When did it start? (hours ago)">
        <Stepper value={hoursAgo} onChange={setHoursAgo} max={72} suffix={hoursAgo === 0 ? '(now)' : 'ago'} />
      </Field>
      <Field label="How long did it last? (hours)">
        <Stepper value={hours} onChange={setHours} step={0.5} max={240} suffix="hrs" />
      </Field>
      <Check label="I had to stop what I was doing and lie down" value={liedDown} onChange={setLiedDown} />
      <Field label="What did it stop you from doing?">
        <Input multiline value={note} onChangeText={setNote} placeholder="Example: Left work at 1300, couldn't drive, lay down in a dark room" />
      </Field>
      <Row style={{ gap: 8 }}>
        <Button kind="ghost" label="Cancel" onPress={onDone} />
        <Button label="Save flare-up" onPress={save} />
      </Row>
    </Panel>
  );
}

function DeadlineForm({ onDone }: { onDone: () => void }) {
  const s = useStore();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [date, setDate] = useState(addDays(today(), 14));
  const presets = ['C&P exam', 'VSO appointment', 'Intent to File expires', 'Doctor visit'];

  const save = () => {
    if (!title.trim()) {
      toast('Give the date a name first');
      return;
    }
    s.write(() => db.addDeadline({ title: title.trim(), detail: detail.trim(), date: dayKey(date) }));
    toast('Date added');
    onDone();
  };

  return (
    <View style={{ gap: 12 }}>
      <Field label="What is it?">
        <Choice options={presets.map(x => ({ value: x, label: x }))} value={title} onChange={setTitle} />
        <Input value={title} onChangeText={setTitle} placeholder="Or type your own" />
      </Field>
      <Field label="Date">
        <DateField value={date} onChange={setDate} />
      </Field>
      <Field label="Notes (optional)">
        <Input value={detail} onChangeText={setDetail} placeholder="Example: Conroe VA clinic, bring symptom summary" />
      </Field>
      <Row style={{ gap: 8 }}>
        <Button kind="ghost" label="Cancel" onPress={onDone} />
        <Button label="Add date" onPress={save} />
      </Row>
    </View>
  );
}
