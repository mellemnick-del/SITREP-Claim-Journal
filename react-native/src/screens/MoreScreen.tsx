import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { INSTRUMENT_ORDER } from '../assessments';
import { useStore } from '../store';
import { fonts, usePalette } from '../theme';
import { CrisisCard } from '../CrisisCard';
import { Chip, Fine, Header, Panel, Screen } from '../ui';
import { dueStatus } from './CheckupsScreen';
import type { MoreStack } from '../navigation';

export default function MoreScreen({ navigation }: NativeStackScreenProps<MoreStack, 'MoreHome'>) {
  const s = useStore();
  const p = usePalette();
  const due = INSTRUMENT_ORDER.filter(k => dueStatus(k, s.assessments).due).length;

  const rows: { title: string; detail: string; to: keyof MoreStack; chip?: string }[] = [
    { title: 'Mental health check-ups', detail: 'PTSD, depression and anxiety questionnaires with trends', to: 'Checkups', chip: due ? `${due} due` : undefined },
    { title: 'Export summary', detail: 'PDF for your VSO, C&P exam or provider', to: 'Export' },
    { title: 'Settings', detail: 'Reminders, Face ID lock, backup and your data', to: 'Settings' },
  ];

  return (
    <Screen>
      <Header eyebrow="SITREP" title="More" />
      <Panel style={{ padding: 0, gap: 0 }}>
        {rows.map((r, i) => (
          <Pressable
            key={r.to}
            onPress={() => navigation.navigate(r.to as 'Checkups')}
            accessibilityRole="button"
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              borderTopWidth: i ? 1 : 0,
              borderTopColor: p.line,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: fonts.bodySemi, fontSize: 16, color: p.fg }}>{r.title}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: p.muted }}>{r.detail}</Text>
            </View>
            {r.chip && <Chip label={r.chip} tone="warn" />}
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: p.muted }}>›</Text>
          </Pressable>
        ))}
      </Panel>
      <CrisisCard />
      <Fine>SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA.</Fine>
    </Screen>
  );
}
