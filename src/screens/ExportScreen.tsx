import React, { useState } from 'react';
import { Text, View } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, Paths } from 'expo-file-system';
import * as db from '../db';
import { addDays, dayKey, fmtFull, fmtMonthDay, fromDayKey, lastDays, today } from '../dates';
import { conditionStats, daysLogged, useStore, WINDOW } from '../store';
import { fonts, usePalette } from '../theme';
import { useToast } from '../Toast';
import { Body, Button, Divider, Eyebrow, Field, Fine, H2, Header, Input, Mono, Panel, Row, Screen, Strong } from '../ui';

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export default function ExportScreen() {
  const s = useStore();
  const p = usePalette();
  const toast = useToast();
  const [name, setName] = useState(() => db.getMeta('veteranName') ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  const from = addDays(today(), -(WINDOW - 1));
  const rows = s.conditions.map(c => ({ c, st: conditionStats(s, c.id) }));
  const notes = lastDays(WINDOW)
    .map(d => s.checkins[dayKey(d)])
    .filter((c): c is db.CheckIn => !!c && !!c.note)
    .slice(-8)
    .reverse();
  const flareNotes = s.flares.filter(f => f.start >= from.getTime() && f.note);

  const exportPdf = async () => {
    setBusy(true);
    try {
      const html = buildHtml(name, from, rows, notes, flareNotes, s.conditions, daysLogged(s));
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Share symptom summary' });
      } else {
        toast('PDF created, but sharing isn\'t available on this device');
      }
    } catch {
      toast("Couldn't create the PDF. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header eyebrow="For your VSO or C&P exam" title="Export" />

      <Panel>
        <Field label="Name on the summary">
          <Input value={name} onChangeText={setName} onEndEditing={() => s.write(() => db.setMeta('veteranName', name.trim()))} placeholder="Your name" autoComplete="name" />
        </Field>
        <Divider />
        <View style={{ gap: 4 }}>
          <Eyebrow>Symptom summary preview</Eyebrow>
          <H2>{name.trim() || 'Your name'}</H2>
          <Mono>
            {fmtFull(from)} to {fmtFull(today())} · {daysLogged(s)} of {WINDOW} days logged
          </Mono>
        </View>
        {rows.length === 0 && <Body muted>Add conditions and log a few days to build your summary.</Body>}
        {rows.map(({ c, st }) => (
          <View key={c.id} style={{ gap: 2 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Strong>{c.name}</Strong>
              {!!c.dc && <Mono>DC {c.dc}</Mono>}
            </Row>
            <Body small muted>
              Avg {st.avg.toFixed(1)}/10 · peak {st.peak} · {st.flares} flare-up{st.flares === 1 ? '' : 's'}
              {st.flares ? ` (avg ${Math.round(st.avgHours)} hrs)` : ''} · {st.limitedDays} limited day{st.limitedDays === 1 ? '' : 's'}
              {st.liedDown ? ` · ${st.liedDown} required lying down` : ''}
            </Body>
          </View>
        ))}
        <Button label={busy ? 'Creating PDF…' : 'Create and share PDF'} onPress={exportPdf} />
        <Fine>The PDF is made on this phone. You choose where it goes: email, print, Files, or your VSO.</Fine>
      </Panel>

      <Panel>
        <H2>Your data</H2>
        <Body small muted>
          Everything in SITREP is stored only on this phone. There's no account and nothing is uploaded. If you delete the app, your data is
          deleted with it.
        </Body>
        {s.isExample && (
          <Body small>You're looking at example data. Erase it when you're ready to start your real journal.</Body>
        )}
        {confirmErase ? (
          <View style={{ gap: 8 }}>
            <Body small>This permanently deletes every check-in, flare-up, condition, date and evidence file. It can't be undone.</Body>
            <Row style={{ gap: 8 }}>
              <Button kind="ghost" label="Keep my data" onPress={() => setConfirmErase(false)} />
              <Button
                kind="danger"
                label="Erase everything"
                onPress={() => {
                  try {
                    const dir = new Directory(Paths.document, 'evidence');
                    if (dir.exists) dir.delete();
                  } catch {
                    // No evidence folder yet.
                  }
                  s.write(() => db.eraseEverything());
                  setName('');
                  setConfirmErase(false);
                  toast('All data erased');
                }}
              />
            </Row>
          </View>
        ) : (
          <Text onPress={() => setConfirmErase(true)} accessibilityRole="button" style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: p.flare }}>
            Erase all data
          </Text>
        )}
      </Panel>
      <Fine>SITREP is an organizer. It isn't legal or medical advice and isn't affiliated with the VA.</Fine>
    </Screen>
  );
}

function buildHtml(
  name: string,
  from: Date,
  rows: { c: db.Condition; st: ReturnType<typeof conditionStats> }[],
  notes: db.CheckIn[],
  flares: db.Flare[],
  conditions: db.Condition[],
  logged: number,
) {
  const condName = (id: number) => conditions.find(c => c.id === id)?.name ?? '';
  const tr = rows
    .map(
      ({ c, st }) =>
        `<tr><td>${esc(c.name)}${c.dc ? ` <span class="m">DC ${esc(c.dc)}</span>` : ''}</td><td class="n">${st.avg.toFixed(1)}</td><td class="n">${st.peak}</td><td class="n">${st.flares}</td><td class="n">${st.flares ? Math.round(st.avgHours) : '-'}</td><td class="n">${st.liedDown}</td><td class="n">${st.limitedDays}</td></tr>`,
    )
    .join('');
  const noteLis = notes.map(n => `<li><span class="m">${fmtMonthDay(fromDayKey(n.day))}</span> ${esc(n.note)}</li>`).join('');
  const flareLis = flares
    .map(f => `<li><span class="m">${fmtMonthDay(new Date(f.start))}</span> ${esc(condName(f.conditionId))}, ${f.hours} hrs${f.liedDown ? ', had to lie down' : ''}. ${esc(f.note)}</li>`)
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#1D2219;margin:36px;font-size:12px;line-height:1.5}
    h1{font-size:22px;margin:0}h2{font-size:14px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.06em}
    .head{border-bottom:2px solid #1D2219;padding-bottom:10px;margin-bottom:12px}
    .eb{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#5C6455}
    .m{font-family:Menlo,Courier,monospace;color:#5C6455;font-size:10px}
    table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #CBD0C0;padding:6px 6px 6px 0;text-align:left}
    th{font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:#5C6455}.n{text-align:right}
    ul{padding-left:16px;margin:0}li{margin-bottom:5px}.fine{margin-top:28px;color:#5C6455;font-size:10px}
  </style></head><body>
    <div class="head"><div class="eb">Symptom summary</div><h1>${esc(name.trim() || 'Veteran')}</h1>
    <div class="m">${fmtFull(from)} to ${fmtFull(today())} · ${logged} of ${WINDOW} days logged · Generated ${fmtFull(new Date())}</div></div>
    <table><thead><tr><th>Condition</th><th class="n">Avg severity</th><th class="n">Peak</th><th class="n">Flare-ups</th><th class="n">Avg hrs</th><th class="n">Had to lie down</th><th class="n">Limited days</th></tr></thead><tbody>${tr}</tbody></table>
    ${flareLis ? `<h2>Flare-ups</h2><ul>${flareLis}</ul>` : ''}
    ${noteLis ? `<h2>In the veteran's words</h2><ul>${noteLis}</ul>` : ''}
    <p class="fine">Self-reported daily log kept in SITREP. Severity is rated by the veteran from 0 (none) to 10 (worst). "Limited days" are days the veteran reported symptoms limited work or daily tasks with a rating of 6 or higher for that condition.</p>
  </body></html>`;
}
