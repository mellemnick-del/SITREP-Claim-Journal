import React from 'react';
import { Text, View } from 'react-native';
import * as db from './db';
import { useStore } from './store';
import { fonts, usePalette } from './theme';
import { Body, Button, Fine, Screen, Strong } from './ui';

export default function Welcome() {
  const s = useStore();
  const p = usePalette();
  const points = [
    ['Log a quick check-in each day', 'Rate each condition, sleep, and how symptoms affected your day.'],
    ['Capture flare-ups as they happen', 'How long they lasted and whether you had to stop and lie down.'],
    ['Track your mental health', 'Standard PTSD, depression and anxiety check-ups your provider already uses.'],
    ['Keep your evidence organized', 'Track what you have, what you requested, and what you still need.'],
    ['Hand your VSO a clean summary', 'Export a PDF timeline for your VSO or C&P exam.'],
  ];
  return (
    <Screen>
      <View style={{ gap: 8, paddingTop: 24 }}>
        <Text style={{ fontFamily: fonts.displayBold, fontSize: 44, letterSpacing: 4, color: p.fg }}>
          SIT<Text style={{ color: p.accent }}>REP</Text>
        </Text>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: p.fg }}>A daily journal for your VA claim.</Text>
      </View>
      <View style={{ gap: 14 }}>
        {points.map(([t, d]) => (
          <View key={t} style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 4, borderRadius: 2, backgroundColor: p.accent }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Strong>{t}</Strong>
              <Body muted small>{d}</Body>
            </View>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: p.sunken, borderRadius: 10, padding: 14, gap: 4 }}>
        <Strong>Private by design</Strong>
        <Body small muted>No account. Nothing is uploaded. Your journal lives only on this phone.</Body>
      </View>
      <View style={{ gap: 10 }}>
        <Button label="Start my journal" onPress={() => s.write(() => db.setMeta('onboarded', '1'))} />
        <Button
          kind="ghost"
          label="Look around with example data"
          onPress={() =>
            s.write(() => {
              db.loadExampleData();
              db.setMeta('onboarded', '1');
            })
          }
        />
      </View>
      <Fine>SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA. Talk with an accredited VSO about your claim.</Fine>
    </Screen>
  );
}
