import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { dayKey, lastDays, startOfDay } from './dates';
import { useStore, WINDOW, windowStart } from './store';
import { fonts, usePalette } from './theme';
import { Body, Row } from './ui';

/** 30 daily bars for one condition: severity height, flare-up days in the flare color, unlogged days as a stub. */
export function SeverityChart({ conditionId }: { conditionId: number }) {
  const s = useStore();
  const p = usePalette();
  const days = lastDays(WINDOW);
  const flareDays = new Set(
    s.flares.filter(f => f.conditionId === conditionId && f.start >= windowStart()).map(f => dayKey(startOfDay(new Date(f.start)))),
  );
  const W = 320;
  const H = 80;
  const L = 18;
  const bw = (W - L) / WINDOW;

  return (
    <View style={{ gap: 4 }}>
      <Svg width="100%" height={H + 6} viewBox={`0 0 ${W} ${H + 6}`} accessibilityLabel="Daily severity for the last 30 days">
        {[10, 5].map(v => {
          const y = 4 + H - (v / 10) * H;
          return (
            <React.Fragment key={v}>
              <Line x1={L} x2={W} y1={y} y2={y} stroke={p.line} strokeWidth={1} />
              <SvgText x={0} y={y + 3} fontSize={9} fill={p.muted} fontFamily={fonts.mono}>
                {v}
              </SvgText>
            </React.Fragment>
          );
        })}
        {days.map((d, i) => {
          const v = s.checkins[dayKey(d)]?.severity[conditionId];
          const x = L + i * bw + 1;
          if (v == null) return <Rect key={i} x={x} y={H + 1} width={bw - 2} height={2} fill={p.line} />;
          const h = Math.max(2, (v / 10) * H);
          return <Rect key={i} x={x} y={4 + H - h} width={bw - 2} height={h} rx={1} fill={flareDays.has(dayKey(d)) ? p.flare : p.accent} />;
        })}
      </Svg>
      <Row style={{ justifyContent: 'space-between', paddingLeft: 18 }}>
        <Body small muted>30 days ago</Body>
        <Body small muted>Today</Body>
      </Row>
    </View>
  );
}

export function ChartLegend() {
  const p = usePalette();
  const item = (color: string, label: string) => (
    <Row style={{ gap: 6 }} key={label}>
      <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color }} />
      <Body small muted>{label}</Body>
    </Row>
  );
  return <Row style={{ flexWrap: 'wrap', gap: 14 }}>{[item(p.accent, 'Daily severity'), item(p.flare, 'Flare-up day'), item(p.line, 'Not logged')]}</Row>;
}
