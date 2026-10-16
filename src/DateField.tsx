import React, { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fmtFull } from './dates';
import { fonts, useIsDark, usePalette } from './theme';

export function DateField({ value, onChange }: { value: Date; onChange: (d: Date) => void }) {
  const p = usePalette();
  const dark = useIsDark();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="compact"
        themeVariant={dark ? 'dark' : 'light'}
        accentColor={p.accent}
        onChange={(_, d) => d && onChange(d)}
        style={{ alignSelf: 'flex-start' }}
      />
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={{ borderWidth: 1, borderColor: p.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: p.bg }}
      >
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: p.fg }}>{fmtFull(value)}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode="date"
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(d);
          }}
        />
      )}
    </>
  );
}
