import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation }: any) {
  const [properties, setProperties] = useState([]);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>Featured Properties</Text>
      <FlatList
        data={properties}
        renderItem={({ item }: any) => (
          <TouchableOpacity onPress={() => navigation.navigate('PropertyDetail', { property: item })}>
            <View style={{ backgroundColor: '#fff', padding: 16, marginBottom: 12, borderRadius: 8 }}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>{item.title}</Text>
              <Text>₦{item.price?.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item: any) => item.id}
      />
    </View>
  );
}
