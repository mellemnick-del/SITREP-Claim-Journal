import React, { useState } from 'react';
import { Text, View } from 'react-native';
import * as db from '../db';
import { conditionStats, tipFor, useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { useToast } from '../Toast';
import { ChartLegend, SeverityChart } from '../SeverityChart';
import { Body, Button, Chip, Choice, Field, Fine, H2, Header, Input, Mono, Panel, Row, Screen, Stats } from '../ui';

const COMMON: { name: string; dc: string }[] = [
  { name: 'Tinnitus', dc: '6260' },
  { name: 'Lower back strain', dc: '5237' },
  { name: 'Migraines', dc: '8100' },
  { name: 'PTSD', dc: '9411' },
  { name: 'Sleep apnea', dc: '6847' },
  { name: 'Knee pain', dc: '5260' },
];

export default function ConditionsScreen() {
  const s = useStore();
  const p = usePalette();
  const [editing, setEditing] = useState<number | 'new' | null>(s.conditions.length ? null : 'new');

  return (
    <Screen>
      <Header eyebrow={`${s.conditions.length} condition${s.conditions.length === 1 ? '' : 's'} tracked`} title="Conditions" />
      {s.conditions.length > 0 && <ChartLegend />}
      {editing === 'new' && <ConditionForm onDone={() => setEditing(null)} />}
      {s.conditions.map(c => {
        if (editing === c.id) return <ConditionForm key={c.id} condition={c} onDone={() => setEditing(null)} />;
        const st = conditionStats(s, c.id);
        const ev = s.evidence.filter(e => e.conditionId === c.id || e.conditionId === null);
        const have = ev.filter(e => e.status === 'Have').length;
        return (
          <Panel key={c.id}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <H2>{c.name}</H2>
                {!!c.dc && <Mono>DC {c.dc}</Mono>}
              </View>
              <Chip label={c.status} tone={c.status === 'Filed' || c.status === 'Service connected' ? 'accent' : c.status === 'Denied' ? 'flare' : 'neutral'} />
            </Row>
            <SeverityChart conditionId={c.id} />
            <Stats
              items={[
                { value: st.avg.toFixed(1), label: 'avg severity' },
                { value: String(st.flares), label: st.flares ? `flare-ups, avg ${Math.round(st.avgHours)} hrs` : 'flare-ups' },
                { value: `${have}/${ev.length}`, label: 'evidence ready' },
              ]}
            />
            {st.liedDown > 0 && (
              <Row style={{ justifyContent: 'space-between' }}>
                <Body style={{ flex: 1 }}>Flare-ups where you had to lie down</Body>
                <Chip label={`${st.liedDown} in 30 days`} tone="flare" />
              </Row>
            )}
            <View style={{ backgroundColor: p.accentSoft, borderRadius: 8, padding: 12 }}>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: p.fg }}>
                <Text style={{ fontFamily: fonts.bodySemi, color: p.accent }}>What to track: </Text>
                {tipFor(c.dc)}
              </Text>
            </View>
            <Text onPress={() => setEditing(c.id)} accessibilityRole="button" style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: p.accent }}>
              Edit condition
            </Text>
          </Panel>
        );
      })}
      {editing !== 'new' && <Button kind="ghost" label="Add a condition" onPress={() => setEditing('new')} />}
      <Fine>Diagnostic codes (DC) are for reference. Confirm yours with your VSO or your rating decision letter.</Fine>
    </Screen>
  );
}

function ConditionForm({ condition, onDone }: { condition?: db.Condition; onDone: () => void }) {
  const s = useStore();
  const p = usePalette();
  const toast = useToast();
  const [name, setName] = useState(condition?.name ?? '');
  const [dc, setDc] = useState(condition?.dc ?? '');
  const [status, setStatus] = useState<db.ConditionStatus>(condition?.status ?? 'Planned');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    if (!name.trim()) {
      toast('Give the condition a name first');
      return;
    }
    s.write(() => (condition ? db.updateCondition(condition.id, name.trim(), dc.trim(), status) : db.addCondition(name.trim(), dc.trim(), status)));
    toast(condition ? 'Condition updated' : 'Condition added');
    onDone();
  };

  return (
    <Panel>
      <H2>{condition ? 'Edit condition' : 'Add a condition'}</H2>
      {!condition && (
        <Field label="Common conditions">
          <Choice
            options={COMMON.map(c => ({ value: c.name, label: c.name }))}
            value={name}
            onChange={v => {
              setName(v);
              setDc(COMMON.find(c => c.name === v)?.dc ?? '');
            }}
          />
        </Field>
      )}
      <Field label="Name">
        <Input value={name} onChangeText={setName} placeholder="Example: Right shoulder" />
      </Field>
      <Field label="Diagnostic code (optional)">
        <Input value={dc} onChangeText={setDc} placeholder="Example: 5201" keyboardType="number-pad" />
      </Field>
      <Field label="Claim status">
        <Choice options={db.CONDITION_STATUSES.map(x => ({ value: x, label: x }))} value={status} onChange={setStatus} />
      </Field>
      <Row style={{ gap: 8 }}>
        <Button kind="ghost" label="Cancel" onPress={onDone} />
        <Button label={condition ? 'Save changes' : 'Add condition'} onPress={save} />
      </Row>
      {condition &&
        (confirmDelete ? (
          <View style={{ gap: 8 }}>
            <Body small>This deletes {condition.name} and every rating, flare-up and evidence item linked to it.</Body>
            <Button
              kind="danger"
              label={`Delete ${condition.name}`}
              onPress={() => {
                s.write(() => db.deleteCondition(condition.id));
                toast('Condition deleted');
                onDone();
              }}
            />
          </View>
        ) : (
          <Text onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: p.flare }}>
            Delete condition
          </Text>
        ))}
    </Panel>
  );
}
