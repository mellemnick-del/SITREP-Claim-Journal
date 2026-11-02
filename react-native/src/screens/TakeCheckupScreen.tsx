import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import * as db from '../db';
import { bandFor, INSTRUMENTS, needsCrisisSupport } from '../assessments';
import { useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { CrisisCard } from '../CrisisCard';
import { Body, Button, Chip, Eyebrow, Fine, H2, Panel, Row, Screen } from '../ui';
import type { MoreStack } from '../navigation';

export default function TakeCheckupScreen({ route, navigation }: NativeStackScreenProps<MoreStack, 'TakeCheckup'>) {
  const { kind } = route.params;
  const ins = INSTRUMENTS[kind];
  const s = useStore();
  const p = usePalette();
  const [answers, setAnswers] = useState<(number | null)[]>(() => ins.items.map(() => null));
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState(false);

  const previous = s.assessments.find(a => a.kind === kind);

  const choose = (v: number) => {
    Haptics.selectionAsync();
    const next = answers.slice();
    next[idx] = v;
    setAnswers(next);
    if (idx < ins.items.length - 1) {
      setIdx(idx + 1);
    } else {
      s.write(() => db.addAssessment(kind, next as number[]));
      setDone(true);
    }
  };

  if (done) {
    const final = answers as number[];
    const total = final.reduce((a, b) => a + b, 0);
    const band = bandFor(kind, total);
    const crisis = needsCrisisSupport(kind, final);
    return (
      <Screen>
        {crisis && <CrisisCard urgent />}
        <Panel>
          <Eyebrow>{ins.short} result</Eyebrow>
          <Text style={{ fontFamily: fonts.display, fontSize: 56, lineHeight: 58, color: p.fg }}>
            {total}
            <Text style={{ fontSize: 22 }}> / {ins.max}</Text>
          </Text>
          <Chip label={band.label} tone={band.tone} />
          {previous && (
            <Body>
              Last time you scored {previous.total}.{' '}
              {total === previous.total ? 'No change.' : total < previous.total ? `That's ${previous.total - total} lower.` : `That's ${total - previous.total} higher.`}
            </Body>
          )}
          <Body muted small>
            Saved to your journal. This score doesn't diagnose anything. It's a snapshot to share with your provider, and it's included in your
            exported summary.
          </Body>
        </Panel>
        <Button label="Done" onPress={() => navigation.goBack()} />
        <Fine>{ins.source}</Fine>
      </Screen>
    );
  }

  const progress = (idx + 1) / ins.items.length;
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Eyebrow>{ins.short}</Eyebrow>
          <Eyebrow>
            {idx + 1} of {ins.items.length}
          </Eyebrow>
        </Row>
        <View style={{ height: 4, backgroundColor: p.line, borderRadius: 2 }}>
          <View style={{ height: 4, width: `${progress * 100}%`, backgroundColor: p.accent, borderRadius: 2 }} />
        </View>
      </View>
      <Body muted small>{ins.prompt}</Body>
      <H2 style={{ fontSize: 26, lineHeight: 31 }}>{ins.items[idx]}</H2>
      <View style={{ gap: 8 }}>
        {ins.options.map((o, v) => {
          const on = answers[idx] === v;
          return (
            <Pressable
              key={o}
              onPress={() => choose(v)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({
                borderWidth: 1,
                borderColor: on ? p.accent : p.line,
                backgroundColor: on ? p.accentSoft : p.surface,
                borderRadius: 10,
                paddingVertical: 15,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: p.muted, width: 16 }}>{v}</Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: p.fg, flex: 1 }}>{o}</Text>
            </Pressable>
          );
        })}
      </View>
      <Row style={{ gap: 8 }}>
        {idx > 0 && <Button kind="ghost" label="Back" onPress={() => setIdx(idx - 1)} />}
        <Button kind="ghost" label="Stop for now" onPress={() => navigation.goBack()} />
      </Row>
      <Fine>Answers are only saved when you finish all {ins.items.length} questions.</Fine>
    </Screen>
  );
}
