import React from 'react';
import { Linking, Text, View } from 'react-native';
import { CRISIS } from './assessments';
import { fonts, usePalette } from './theme';
import { Body, Button, Row } from './ui';

/** Veterans Crisis Line. Shown after a concerning answer and always reachable from More. */
export function CrisisCard({ urgent }: { urgent?: boolean }) {
  const p = usePalette();
  return (
    <View style={{ backgroundColor: urgent ? p.flareSoft : p.surface, borderColor: urgent ? p.flare : p.line, borderWidth: 1, borderRadius: 12, padding: 16, gap: 12 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 22, color: urgent ? p.flare : p.fg }}>
        {urgent ? "You don't have to carry this alone" : 'Veterans Crisis Line'}
      </Text>
      <Body>
        {urgent
          ? 'You mentioned thoughts of being better off dead or hurting yourself. Caring, qualified responders at the Veterans Crisis Line are available 24/7, and many of them are veterans. It is free and confidential.'
          : 'Free, confidential support 24/7 for veterans, service members and their families. You don’t have to be enrolled in VA benefits or health care.'}
      </Body>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        <Button label={`Call ${CRISIS.call}, press 1`} onPress={() => Linking.openURL(`tel:${CRISIS.call}`)} />
        <Button kind="ghost" label={`Text ${CRISIS.text}`} onPress={() => Linking.openURL(`sms:${CRISIS.text}`)} />
      </Row>
      <Text onPress={() => Linking.openURL(CRISIS.chat)} accessibilityRole="link" style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: p.accent }}>
        Chat online at VeteransCrisisLine.net
      </Text>
      {urgent && <Body small muted>If you are in immediate danger, call 911.</Body>}
    </View>
  );
}
