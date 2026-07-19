import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

interface ShortletProperty {
  id: number;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  imageUrl: string;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  amenities: string[];
}

export default function ShortletSearchScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  const [guests, setGuests] = useState(2);
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [showCheckOutPicker, setShowCheckOutPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock data - replace with API call
  const mockProperties: ShortletProperty[] = [
    {
      id: 1,
      title: 'Luxury Apartment in Victoria Island',
      location: 'Victoria Island, Lagos',
      price: 25000,
      rating: 4.8,
      reviews: 124,
      imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      bedrooms: 2,
      bathrooms: 2,
      guests: 4,
      amenities: ['WiFi', 'Pool', 'Gym', 'Parking'],
    },
    {
      id: 2,
      title: 'Modern Studio in Lekki Phase 1',
      location: 'Lekki, Lagos',
      price: 15000,
      rating: 4.6,
      reviews: 89,
      imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      bedrooms: 1,
      bathrooms: 1,
      guests: 2,
      amenities: ['WiFi', 'AC', 'Kitchen'],
    },
    {
      id: 3,
      title: 'Spacious 3BR in Ikoyi',
      location: 'Ikoyi, Lagos',
      price: 35000,
      rating: 4.9,
      reviews: 156,
      imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      bedrooms: 3,
      bathrooms: 3,
      guests: 6,
      amenities: ['WiFi', 'Pool', 'Gym', 'Parking', 'Security'],
    },
  ];

  const [properties] = useState(mockProperties);

  const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

  const renderPropertyCard = ({ item }: { item: ShortletProperty }) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => navigation.navigate('ShortletDetail', { id: item.id })}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.propertyImage} />
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#666" />
          <Text style={styles.locationText}>{item.location}</Text>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="bed-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.bedrooms} beds</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.bathrooms} baths</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="people-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{item.guests} guests</Text>
          </View>
        </View>

        <View style={styles.amenitiesRow}>
          {item.amenities.slice(0, 3).map((amenity, index) => (
            <View key={index} style={styles.amenityBadge}>
              <Text style={styles.amenityText}>{amenity}</Text>
            </View>
          ))}
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {item.rating} ({item.reviews})
            </Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.priceAmount}>₦{item.price.toLocaleString()}</Text>
            <Text style={styles.priceLabel}>/night</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Short-let Rentals</Text>
        <TouchableOpacity>
          <Ionicons name="filter-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search location..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {/* Check-in Date */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowCheckInPicker(true)}
        >
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>
            Check-in: {format(checkIn, 'MMM d')}
          </Text>
        </TouchableOpacity>

        {/* Check-out Date */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowCheckOutPicker(true)}
        >
          <Ionicons name="calendar-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>
            Check-out: {format(checkOut, 'MMM d')}
          </Text>
        </TouchableOpacity>

        {/* Guests */}
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="people-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>{guests} Guests</Text>
        </TouchableOpacity>

        {/* Nights */}
        <View style={styles.filterButton}>
          <Ionicons name="moon-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>{nights} Nights</Text>
        </View>
      </ScrollView>

      {/* Date Pickers */}
      {showCheckInPicker && (
        <DateTimePicker
          value={checkIn}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowCheckInPicker(false);
            if (selectedDate) {
              setCheckIn(selectedDate);
              // Ensure check-out is after check-in
              if (selectedDate >= checkOut) {
                setCheckOut(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
              }
            }
          }}
        />
      )}

      {showCheckOutPicker && (
        <DateTimePicker
          value={checkOut}
          mode="date"
          display="default"
          minimumDate={new Date(checkIn.getTime() + 24 * 60 * 60 * 1000)}
          onChange={(event, selectedDate) => {
            setShowCheckOutPicker(false);
            if (selectedDate) setCheckOut(selectedDate);
          }}
        />
      )}

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{properties.length} properties available</Text>
        <TouchableOpacity>
          <Text style={styles.sortText}>Sort by: Price</Text>
        </TouchableOpacity>
      </View>

      {/* Properties List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={properties}
          renderItem={renderPropertyCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchSection: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  resultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  sortText: {
    fontSize: 14,
    color: '#007AFF',
  },
  listContainer: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  propertyImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#E5E5E5',
  },
  propertyInfo: {
    padding: 12,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  amenityBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  amenityText: {
    fontSize: 12,
    color: '#666',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  priceLabel: {
    fontSize: 12,
    color: '#666',
    marginLeft: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
