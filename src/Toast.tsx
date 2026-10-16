import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { fonts, usePalette } from './theme';

const Ctx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const p = usePalette();
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {msg && (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: 96, alignItems: 'center' }}>
          <View style={{ backgroundColor: p.fg, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: p.bg, fontFamily: fonts.bodySemi, fontSize: 14 }}>{msg}</Text>
          </View>
        </View>
      )}
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
