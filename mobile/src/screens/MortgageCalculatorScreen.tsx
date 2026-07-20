import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BANKS = [
  { name: 'GTBank', rate: 22.5, maxLTV: 70 },
  { name: 'First Bank', rate: 21.0, maxLTV: 70 },
  { name: 'Access Bank', rate: 23.0, maxLTV: 65 },
  { name: 'Zenith Bank', rate: 22.0, maxLTV: 70 },
  { name: 'UBA', rate: 21.5, maxLTV: 70 },
];

function calcMonthly(principal: number, annualRate: number, years: number): number {
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

export default function MortgageCalculatorScreen() {
  const [price, setPrice] = useState('50000000');
  const [deposit, setDeposit] = useState('30');
  const [years, setYears] = useState('20');

  const priceNum = parseFloat(price) || 0;
  const depositPct = parseFloat(deposit) || 30;
  const yearsNum = parseInt(years) || 20;
  const depositAmt = priceNum * depositPct / 100;
  const principal = priceNum - depositAmt;

  const results = useMemo(() => BANKS.map(b => ({
    ...b,
    monthly: calcMonthly(principal, b.rate, yearsNum),
    total: calcMonthly(principal, b.rate, yearsNum) * yearsNum * 12,
    eligible: depositPct >= (100 - b.maxLTV),
  })), [principal, yearsNum, depositPct]);

  const fmt = (n: number) => n >= 1e9 ? `₦${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `₦${(n/1e6).toFixed(2)}M` : `₦${(n/1e3).toFixed(0)}K`;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Mortgage Calculator</Text>
        <Text style={s.subtitle}>CBN MPR: 27.25%</Text>

        <View style={s.card}>
          <Text style={s.label}>Property Price (₦)</Text>
          <TextInput style={s.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="50,000,000" />

          <Text style={s.label}>Deposit: {deposit}%</Text>
          <View style={s.row}>
            {[10, 20, 30, 40, 50].map(p => (
              <TouchableOpacity key={p} style={[s.pctBtn, deposit === String(p) && s.pctBtnActive]} onPress={() => setDeposit(String(p))}>
                <Text style={[s.pctText, deposit === String(p) && s.pctTextActive]}>{p}%</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.label}>Loan Term: {years} years</Text>
          <View style={s.row}>
            {[10, 15, 20, 25, 30].map(y => (
              <TouchableOpacity key={y} style={[s.pctBtn, years === String(y) && s.pctBtnActive]} onPress={() => setYears(String(y))}>
                <Text style={[s.pctText, years === String(y) && s.pctTextActive]}>{y}yr</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.summary}>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Deposit Amount</Text><Text style={s.summaryValue}>{fmt(depositAmt)}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryLabel}>Loan Amount</Text><Text style={s.summaryValue}>{fmt(principal)}</Text></View>
          </View>
        </View>

        <Text style={s.sectionTitle}>Bank Comparison</Text>
        {results.map(b => (
          <View key={b.name} style={[s.bankCard, !b.eligible && s.bankCardDisabled]}>
            <View style={s.bankHeader}>
              <Text style={s.bankName}>{b.name}</Text>
              <View style={[s.eligBadge, b.eligible ? s.eligBadgeOk : s.eligBadgeNo]}>
                <Text style={s.eligText}>{b.eligible ? '✓ Eligible' : `Min ${100 - b.maxLTV}% deposit`}</Text>
              </View>
            </View>
            <View style={s.bankStats}>
              <View style={s.bankStat}><Text style={s.bankStatVal}>{b.rate}%</Text><Text style={s.bankStatLabel}>Annual Rate</Text></View>
              <View style={s.bankStat}><Text style={s.bankStatVal}>{fmt(b.monthly)}</Text><Text style={s.bankStatLabel}>Monthly</Text></View>
              <View style={s.bankStat}><Text style={s.bankStatVal}>{fmt(b.total)}</Text><Text style={s.bankStatLabel}>Total Cost</Text></View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faff' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#007AFF', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 8 },
  pctBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  pctBtnActive: { borderColor: '#007AFF', backgroundColor: '#eff6ff' },
  pctText: { fontSize: 13, color: '#555' },
  pctTextActive: { color: '#007AFF', fontWeight: '700' },
  summary: { marginTop: 20, backgroundColor: '#f8faff', borderRadius: 12, padding: 16, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: '#555' },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  bankCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  bankCardDisabled: { opacity: 0.5 },
  bankHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  bankName: { fontSize: 16, fontWeight: '700' },
  eligBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  eligBadgeOk: { backgroundColor: '#dcfce7' },
  eligBadgeNo: { backgroundColor: '#fee2e2' },
  eligText: { fontSize: 11, fontWeight: '600' },
  bankStats: { flexDirection: 'row' },
  bankStat: { flex: 1, alignItems: 'center' },
  bankStatVal: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
  bankStatLabel: { fontSize: 11, color: '#888', marginTop: 2 },
});
