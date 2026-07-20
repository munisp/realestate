import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const TIMES = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const TYPES = [
  { id: 'physical', label: 'Physical Tour', icon: '🏠' },
  { id: 'virtual', label: 'Virtual Tour', icon: '💻' },
  { id: 'inspection', label: 'Full Inspection', icon: '🔍' },
];

export default function BookingScreen({ route, navigation }: any) {
  const { propertyId, propertyTitle } = route?.params || {};
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [tourType, setTourType] = useState('physical');
  const [notes, setNotes] = useState('');

  const today = new Date();
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i + 1);
    return { value: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) };
  });

  const handleBook = () => {
    if (!selectedDate || !selectedTime) { Alert.alert('Missing Info', 'Please select a date and time.'); return; }
    Alert.alert('Booking Confirmed!', `Your ${tourType} tour is scheduled for ${selectedDate} at ${selectedTime}.`, [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Book a Tour</Text>
        {propertyTitle && <Text style={s.subtitle}>{propertyTitle}</Text>}

        <Text style={s.sectionLabel}>Tour Type</Text>
        <View style={s.row}>
          {TYPES.map(t => (
            <TouchableOpacity key={t.id} style={[s.typeCard, tourType === t.id && s.typeCardActive]} onPress={() => setTourType(t.id)}>
              <Text style={s.typeIcon}>{t.icon}</Text>
              <Text style={[s.typeLabel, tourType === t.id && s.typeLabelActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateScroll}>
          {dates.map(d => (
            <TouchableOpacity key={d.value} style={[s.dateChip, selectedDate === d.value && s.dateChipActive]} onPress={() => setSelectedDate(d.value)}>
              <Text style={[s.dateText, selectedDate === d.value && s.dateTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={s.sectionLabel}>Select Time</Text>
        <View style={s.timeGrid}>
          {TIMES.map(t => (
            <TouchableOpacity key={t} style={[s.timeChip, selectedTime === t && s.timeChipActive]} onPress={() => setSelectedTime(t)}>
              <Text style={[s.timeText, selectedTime === t && s.timeTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.sectionLabel}>Notes (optional)</Text>
        <TextInput style={s.notesInput} placeholder="Any special requirements..." value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

        <TouchableOpacity style={s.bookBtn} onPress={handleBook}>
          <Text style={s.bookBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '600', marginTop: 20, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  typeCard: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#e5e7eb', alignItems: 'center' },
  typeCardActive: { borderColor: '#007AFF', backgroundColor: '#eff6ff' },
  typeIcon: { fontSize: 24, marginBottom: 4 },
  typeLabel: { fontSize: 11, textAlign: 'center', color: '#666' },
  typeLabelActive: { color: '#007AFF', fontWeight: '600' },
  dateScroll: { marginBottom: 4 },
  dateChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb', marginRight: 8 },
  dateChipActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  dateText: { fontSize: 13, color: '#333' },
  dateTextActive: { color: '#fff', fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#e5e7eb' },
  timeChipActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  timeText: { fontSize: 14, color: '#333' },
  timeTextActive: { color: '#fff', fontWeight: '600' },
  notesInput: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  bookBtn: { backgroundColor: '#007AFF', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
