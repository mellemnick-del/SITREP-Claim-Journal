import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as db from './db';
import { fonts, usePalette } from './theme';
import { Body, Button } from './ui';

export async function biometricsAvailable() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
}

export async function confirmIdentity(reason: string) {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: reason, fallbackLabel: 'Use passcode' });
  return r.success;
}

const lockOn = () => db.getMeta('lock') === '1';

/** Covers the app with a lock screen at launch and whenever it comes back from the background, if app lock is on. */
export function LockGate({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  const [locked, setLocked] = useState(lockOn);
  const busy = useRef(false);

  const unlock = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (await confirmIdentity('Unlock SITREP')) setLocked(false);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    // Only "background" locks. "inactive" also fires while Face ID itself is showing.
    const sub = AppState.addEventListener('change', s => {
      if (s === 'background' && lockOn()) setLocked(true);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (locked) unlock();
  }, [locked, unlock]);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {locked && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 40, letterSpacing: 4, color: p.fg }}>
            SIT<Text style={{ color: p.accent }}>REP</Text>
          </Text>
          <Body muted style={{ textAlign: 'center' }}>Your journal is locked.</Body>
          <Button label="Unlock" onPress={unlock} style={{ flexGrow: 0, alignSelf: 'stretch' }} />
        </View>
      )}
    </View>
  );
}
