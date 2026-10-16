import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, Palette, usePalette } from './theme';

export function Screen({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 32,
        paddingHorizontal: 16,
        gap: 16,
        width: '100%',
        maxWidth: 560,
        alignSelf: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Header({ eyebrow, title }: { eyebrow: string; title: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: 4 }}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <Text style={{ fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: p.fg }}>{title}</Text>
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return (
    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: p.muted }}>
      {children}
    </Text>
  );
}

export function H2({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const p = usePalette();
  return <Text style={[{ fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: p.fg }, style]}>{children}</Text>;
}

export function Body({ children, muted, small, style }: { children: React.ReactNode; muted?: boolean; small?: boolean; style?: TextStyle }) {
  const p = usePalette();
  return (
    <Text style={[{ fontFamily: fonts.body, fontSize: small ? 13 : 15, lineHeight: small ? 18 : 22, color: muted ? p.muted : p.fg }, style]}>
      {children}
    </Text>
  );
}

export function Strong({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  return <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21, color: p.fg }}>{children}</Text>;
}

export function Mono({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const p = usePalette();
  return <Text style={[{ fontFamily: fonts.mono, fontSize: 12, color: p.muted }, style]}>{children}</Text>;
}

export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View style={[{ backgroundColor: p.surface, borderColor: p.line, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 12, padding: 16, gap: 14 }, style]}>
      {children}
    </View>
  );
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>;
}

export type Tone = 'neutral' | 'ok' | 'warn' | 'flare' | 'accent';
function toneColors(p: Palette, tone: Tone) {
  switch (tone) {
    case 'ok':
      return [p.okSoft, p.ok];
    case 'warn':
      return [p.warnSoft, p.warn];
    case 'flare':
      return [p.flareSoft, p.flare];
    case 'accent':
      return [p.accentSoft, p.accent];
    default:
      return [p.sunken, p.muted];
  }
}

export function Chip({ label, tone = 'neutral', onPress }: { label: string; tone?: Tone; onPress?: () => void }) {
  const p = usePalette();
  const [bg, fg] = toneColors(p, tone);
  const inner = (
    <Text style={{ fontFamily: fonts.bodySemi, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', color: fg }}>{label}</Text>
  );
  const style: ViewStyle = { backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' };
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [style, pressed && { opacity: 0.7 }]} accessibilityRole="button" hitSlop={8}>
      {inner}
    </Pressable>
  ) : (
    <View style={style}>{inner}</View>
  );
}

export function Button({
  label,
  onPress,
  kind = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'flare' | 'danger';
  style?: ViewStyle;
}) {
  const p = usePalette();
  const bg = kind === 'primary' ? p.accent : kind === 'flare' ? p.flareSoft : 'transparent';
  const fg = kind === 'primary' ? p.accentInk : kind === 'flare' || kind === 'danger' ? p.flare : p.accent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: 10,
          paddingVertical: 13,
          paddingHorizontal: 16,
          alignItems: 'center',
          borderWidth: kind === 'ghost' || kind === 'danger' ? 1 : 0,
          borderColor: kind === 'danger' ? p.flare : p.line,
          flexGrow: 1,
        },
        pressed && { opacity: 0.75 },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function Stats({ items }: { items: { value: string; label: string }[] }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map(it => (
        <View key={it.label} style={{ flex: 1, backgroundColor: p.sunken, borderRadius: 8, padding: 10 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: p.fg, fontVariant: ['tabular-nums'] }}>{it.value}</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: p.muted }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: p.fg }}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const p = usePalette();
  return (
    <TextInput
      placeholderTextColor={p.muted}
      {...props}
      style={[
        {
          fontFamily: fonts.body,
          fontSize: 15,
          color: p.fg,
          backgroundColor: p.bg,
          borderColor: p.line,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 10,
          minHeight: props.multiline ? 84 : undefined,
          textAlignVertical: props.multiline ? 'top' : 'center',
        },
        props.style,
      ]}
    />
  );
}

export function Check({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          borderWidth: 2,
          borderColor: value ? p.accent : p.muted,
          backgroundColor: value ? p.accent : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {value && <Text style={{ color: p.accentInk, fontSize: 14, lineHeight: 16, fontFamily: fonts.bodySemi }}>✓</Text>}
      </View>
      <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21, color: p.fg }}>{label}</Text>
    </Pressable>
  );
}

/** Horizontal row of choice pills, e.g. picking a condition or a status. */
export function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{
              borderWidth: 1,
              borderColor: on ? p.accent : p.line,
              backgroundColor: on ? p.accent : p.surface,
              borderRadius: 999,
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: on ? p.accentInk : p.fg }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 99, suffix }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; suffix?: string }) {
  const p = usePalette();
  const btn = (label: string, delta: number) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, Math.round((value + delta) * 10) / 10)))}
      accessibilityRole="button"
      accessibilityLabel={delta > 0 ? 'Increase' : 'Decrease'}
      style={{ width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: p.line, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: p.accent }}>{label}</Text>
    </Pressable>
  );
  return (
    <Row>
      {btn('−', -step)}
      <Text style={{ fontFamily: fonts.display, fontSize: 24, color: p.fg, minWidth: 72, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
        {suffix ? ` ${suffix}` : ''}
      </Text>
      {btn('+', step)}
    </Row>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: 1, backgroundColor: p.line }} />;
}

export function Fine({ children }: { children: React.ReactNode }) {
  return (
    <Body small muted>
      {children}
    </Body>
  );
}
