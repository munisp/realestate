import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const METHODS = [
  { id: 'card', label: 'Debit/Credit Card', icon: '💳' },
  { id: 'transfer', label: 'Bank Transfer', icon: '🏦' },
  { id: 'ussd', label: 'USSD', icon: '📱' },
  { id: 'wallet', label: 'NaijaHomes Wallet', icon: '👛' },
];

export default function PaymentScreen({ route, navigation }: any) {
  const { amount, description, type } = route?.params || { amount: 500000, description: 'Escrow Deposit', type: 'escrow' };
  const [method, setMethod] = useState('card');
  const [cardNo, setCardNo] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);

  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      Alert.alert('Payment Successful!', `${fmt(amount)} has been processed successfully.`, [
        { text: 'View Receipt', onPress: () => navigation.navigate('PaymentReceipt', { amount, description }) },
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    }, 2000);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Make Payment</Text>
        <View style={s.amountCard}>
          <Text style={s.amountLabel}>{description}</Text>
          <Text style={s.amount}>{fmt(amount)}</Text>
          <Text style={s.amountNote}>Secured by Paystack · End-to-end encrypted</Text>
        </View>

        <Text style={s.sectionLabel}>Payment Method</Text>
        {METHODS.map(m => (
          <TouchableOpacity key={m.id} style={[s.methodRow, method === m.id && s.methodRowActive]} onPress={() => setMethod(m.id)}>
            <Text style={s.methodIcon}>{m.icon}</Text>
            <Text style={s.methodLabel}>{m.label}</Text>
            <View style={[s.radio, method === m.id && s.radioActive]}>{method === m.id && <View style={s.radioDot} />}</View>
          </TouchableOpacity>
        ))}

        {method === 'card' && (
          <View style={s.cardForm}>
            <TextInput style={s.input} placeholder="Card Number" value={cardNo} onChangeText={setCardNo} keyboardType="numeric" maxLength={19} />
            <View style={s.row}>
              <TextInput style={[s.input, s.flex1]} placeholder="MM/YY" value={expiry} onChangeText={setExpiry} keyboardType="numeric" maxLength={5} />
              <TextInput style={[s.input, s.flex1]} placeholder="CVV" value={cvv} onChangeText={setCvv} keyboardType="numeric" maxLength={3} secureTextEntry />
            </View>
          </View>
        )}

        {method === 'ussd' && (
          <View style={s.ussdBox}>
            <Text style={s.ussdCode}>*737*2*{amount}*1234#</Text>
            <Text style={s.ussdNote}>Dial this code on your GTBank line to complete payment</Text>
          </View>
        )}

        <TouchableOpacity style={[s.payBtn, processing && s.payBtnDisabled]} onPress={handlePay} disabled={processing}>
          <Text style={s.payBtnText}>{processing ? 'Processing...' : `Pay ${fmt(amount)}`}</Text>
        </TouchableOpacity>

        <Text style={s.secureNote}>🔒 256-bit SSL encryption · CBN licensed</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  amountCard: { backgroundColor: '#007AFF', borderRadius: 16, padding: 20, marginBottom: 24, alignItems: 'center' },
  amountLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  amount: { color: '#fff', fontSize: 32, fontWeight: '800' },
  amountNote: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 8 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  methodRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', marginBottom: 10 },
  methodRowActive: { borderColor: '#007AFF', backgroundColor: '#f0f9ff' },
  methodIcon: { fontSize: 24, marginRight: 12 },
  methodLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: '#007AFF' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' },
  cardForm: { gap: 12, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },
  ussdBox: { backgroundColor: '#f0f9ff', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 8 },
  ussdCode: { fontSize: 22, fontWeight: '700', color: '#007AFF', letterSpacing: 1 },
  ussdNote: { fontSize: 13, color: '#555', textAlign: 'center', marginTop: 8 },
  payBtn: { backgroundColor: '#007AFF', borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 20 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secureNote: { textAlign: 'center', color: '#888', fontSize: 12, marginTop: 16 },
});
