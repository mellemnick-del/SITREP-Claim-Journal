import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as db from '../db';
import { dtg, fmtShort, fromDayKey } from '../dates';
import { useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { Body, Choice, Chip, Header, Mono, Panel, Row, Screen, Strong } from '../ui';

type Item =
  | { kind: 'checkin'; t: number; c: db.CheckIn }
  | { kind: 'flare'; t: number; f: db.Flare };

export default function LogScreen() {
  const s = useStore();
  const p = usePalette();
  const [filter, setFilter] = useState<string>('all');

  const items: Item[] = [
    ...Object.values(s.checkins).map(c => ({ kind: 'checkin' as const, t: fromDayKey(c.day).getTime() + 1, c })),
    ...s.flares.map(f => ({ kind: 'flare' as const, t: f.start, f })),
  ].sort((a, b) => b.t - a.t);

  const shown = items.filter(it => {
    if (filter === 'all') return true;
    if (filter === 'flares') return it.kind === 'flare';
    const id = Number(filter);
    return it.kind === 'flare' ? it.f.conditionId === id : (it.c.severity[id] ?? 0) >= 6 || !!it.c.note;
  });

  const nameOf = (id: number) => s.conditions.find(c => c.id === id)?.name ?? 'Removed condition';
  const shortOf = (id: number) => (nameOf(id).split(' ')[0] ?? '').toUpperCase().slice(0, 6);

  return (
    <Screen>
      <Header eyebrow="Everything you've logged" title="Log" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
        <Choice
          options={[{ value: 'all', label: 'All' }, { value: 'flares', label: 'Flare-ups' }, ...s.conditions.map(c => ({ value: String(c.id), label: c.name }))]}
          value={filter}
          onChange={setFilter}
        />
      </ScrollView>
      <Panel style={{ gap: 0 }}>
        {shown.length === 0 && <Body muted>Nothing logged for this filter yet. Save a check-in on the Today tab to start your timeline.</Body>}
        {shown.map((it, i) => {
          const top = i === 0 ? {} : { borderTopWidth: 1, borderTopColor: p.line, paddingTop: 12 };
          if (it.kind === 'flare') {
            const f = it.f;
            return (
              <View key={`f${f.id}`} style={[{ flexDirection: 'row', gap: 12, paddingBottom: 12 }, top]}>
                <View style={{ width: 4, borderRadius: 2, backgroundColor: p.flare }} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <Strong>{nameOf(f.conditionId)} flare-up</Strong>
                    <Mono>{dtg(new Date(f.start))}</Mono>
                  </Row>
                  <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                    <Chip label={`${f.hours} hrs`} tone="flare" />
                    {f.liedDown && <Chip label="Had to lie down" tone="flare" />}
                  </Row>
                  {!!f.note && <Body>{f.note}</Body>}
                  <Text
                    onPress={() => s.write(() => db.deleteFlare(f.id))}
                    accessibilityRole="button"
                    style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: p.muted, alignSelf: 'flex-start' }}
                  >
                    Delete
                  </Text>
                </View>
              </View>
            );
          }
          const c = it.c;
          return (
            <View key={`c${c.day}`} style={[{ flexDirection: 'row', gap: 12, paddingBottom: 12 }, top]}>
              <View style={{ width: 4, borderRadius: 2, backgroundColor: p.line }} />
              <View style={{ flex: 1, gap: 6 }}>
                <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <Strong>{fmtShort(fromDayKey(c.day))} check-in</Strong>
                  <Mono>{dtg(new Date(c.savedAt))}</Mono>
                </Row>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {Object.entries(c.severity).map(([id, v]) => (
                    <Text
                      key={id}
                      style={{
                        fontFamily: fonts.mono,
                        fontSize: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 4,
                        overflow: 'hidden',
                        backgroundColor: v >= 7 ? p.flareSoft : p.sunken,
                        color: v >= 7 ? p.flare : p.fg,
                      }}
                    >
                      {shortOf(Number(id))} {v}
                    </Text>
                  ))}
                  {c.sleep != null && (
                    <Text style={{ fontFamily: fonts.mono, fontSize: 12, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden', backgroundColor: p.sunken, color: p.fg }}>
                      SLEEP {c.sleep}h
                    </Text>
                  )}
                  {c.limited && <Chip label="Limited daily tasks" tone="warn" />}
                </View>
                {!!c.note && <Body>{c.note}</Body>}
              </View>
            </View>
          );
        })}
      </Panel>
    </Screen>
  );
}
