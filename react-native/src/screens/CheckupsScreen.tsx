import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import * as db from '../db';
import { bandFor, INSTRUMENT_ORDER, INSTRUMENTS } from '../assessments';
import { DAY, fmtFull, fmtMonthDay } from '../dates';
import { useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { useToast } from '../Toast';
import { Body, Button, Chip, Fine, H2, Header, Mono, Panel, Row, Screen } from '../ui';
import type { MoreStack } from '../navigation';

export function dueStatus(kind: db.AssessmentKind, list: db.Assessment[]) {
  const last = list.find(a => a.kind === kind);
  if (!last) return { due: true, label: 'Not taken yet' };
  const days = Math.floor((Date.now() - last.takenAt) / DAY);
  const every = INSTRUMENTS[kind].everyDays;
  return days >= every ? { due: true, label: `Due, last taken ${days} days ago` } : { due: false, label: `Next in ${every - days} days` };
}

export default function CheckupsScreen() {
  const s = useStore();
  const p = usePalette();
  const nav = useNavigation<NativeStackNavigationProp<MoreStack>>();
  const [history, setHistory] = useState<db.AssessmentKind | null>(null);

  return (
    <Screen underHeader>
      <Header eyebrow="Mental health" title="Check-ups" />
      <Body muted>
        Standard questionnaires used by the VA and mental health providers. Taking them regularly shows how you're doing over time, in a form
        your provider already knows how to read.
      </Body>
      {INSTRUMENT_ORDER.map(kind => {
        const ins = INSTRUMENTS[kind];
        const list = s.assessments.filter(a => a.kind === kind);
        const last = list[0];
        const prev = list[1];
        const due = dueStatus(kind, s.assessments);
        return (
          <Panel key={kind}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <H2>{ins.name}</H2>
                <Body small muted>{ins.about}</Body>
              </View>
            </Row>
            {last ? (
              <Row style={{ alignItems: 'flex-end' }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 42, color: p.fg }}>
                    {last.total}
                    <Text style={{ fontSize: 18 }}> / {ins.max}</Text>
                  </Text>
                  <Chip label={bandFor(kind, last.total).label} tone={bandFor(kind, last.total).tone} />
                </View>
                <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                  <Trend values={list.slice(0, 8).reverse().map(a => a.total)} max={ins.max} />
                  {prev && <Mono>{changeText(last.total - prev.total)} since {fmtMonthDay(new Date(prev.takenAt))}</Mono>}
                </View>
              </Row>
            ) : (
              <Body muted small>No results yet. It takes about {Math.max(2, Math.round(ins.items.length / 5))} minutes.</Body>
            )}
            <Row style={{ justifyContent: 'space-between' }}>
              <Chip label={due.label} tone={due.due ? 'warn' : 'ok'} />
              {list.length > 0 && (
                <Text onPress={() => setHistory(history === kind ? null : kind)} accessibilityRole="button" style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: p.accent }}>
                  {history === kind ? 'Hide history' : `History (${list.length})`}
                </Text>
              )}
            </Row>
            {history === kind && <History list={list} />}
            <Button label={last ? `Take ${ins.short} again` : `Start ${ins.short}`} onPress={() => nav.navigate('TakeCheckup', { kind })} />
          </Panel>
        );
      })}
      <Fine>
        These questionnaires don't diagnose anything. Share your results with your provider. Scores are calculated using each questionnaire's
        published scoring.
      </Fine>
    </Screen>
  );
}

const changeText = (d: number) => (d === 0 ? 'No change' : d > 0 ? `Up ${d}` : `Down ${-d}`);

function History({ list }: { list: db.Assessment[] }) {
  const s = useStore();
  const p = usePalette();
  const toast = useToast();
  return (
    <View style={{ gap: 0 }}>
      {list.map((a, i) => (
        <Row key={a.id} style={{ justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: p.line }}>
          <Mono style={{ color: p.fg }}>{fmtFull(new Date(a.takenAt))}</Mono>
          <Row style={{ gap: 10 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: p.fg }}>{a.total}</Text>
            <Text
              onPress={() => {
                s.write(() => db.deleteAssessment(a.id));
                toast('Result deleted');
              }}
              accessibilityRole="button"
              style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: p.muted }}
            >
              Delete
            </Text>
          </Row>
        </Row>
      ))}
    </View>
  );
}

/** Small line of recent totals, oldest to newest. */
export function Trend({ values, max }: { values: number[]; max: number }) {
  const p = usePalette();
  const W = 140;
  const H = 44;
  if (values.length < 2) return null;
  const pts = values.map((v, i) => [4 + (i * (W - 8)) / (values.length - 1), 4 + (H - 8) * (1 - v / max)] as const);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <Svg width={W} height={H} accessibilityLabel={`Trend of last ${values.length} results`}>
      <Line x1={0} x2={W} y1={H - 4} y2={H - 4} stroke={p.line} strokeWidth={1} />
      <Polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={p.accent} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={lx} cy={ly} r={3.5} fill={p.accent} />
    </Svg>
  );
}
