import React, { useState } from 'react';
import { Platform, Pressable, Text } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { fmtFull, pad } from './dates';
import { fonts, useIsDark, usePalette } from './theme';

export function DateField({ value, onChange, mode = 'date' }: { value: Date; onChange: (d: Date) => void; mode?: 'date' | 'time' }) {
  const p = usePalette();
  const dark = useIsDark();
  const [open, setOpen] = useState(false);

  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
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
        <Text style={{ fontFamily: fonts.body, fontSize: 15, color: p.fg }}>{mode === 'time' ? `${pad(value.getHours())}:${pad(value.getMinutes())}` : fmtFull(value)}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode={mode}
          onChange={(e, d) => {
            setOpen(false);
            if (e.type === 'set' && d) onChange(d);
          }}
        />
      )}
    </>
  );
}
