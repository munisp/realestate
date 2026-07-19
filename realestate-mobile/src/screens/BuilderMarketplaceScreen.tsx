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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface Builder {
  id: number;
  name: string;
  company: string;
  specialization: string;
  rating: number;
  reviews: number;
  projectsCompleted: number;
  yearsExperience: number;
  location: string;
  verified: boolean;
  certifications: string[];
  imageUrl: string;
  priceRange: string;
}

export default function BuilderMarketplaceScreen({ navigation }: any) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBuilder, setSelectedBuilder] = useState<Builder | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteDetails, setQuoteDetails] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock data - replace with API call
  const mockBuilders: Builder[] = [
    {
      id: 1,
      name: 'Adebayo Ogunleye',
      company: 'Premier Constructions Ltd',
      specialization: 'Residential & Commercial',
      rating: 4.9,
      reviews: 156,
      projectsCompleted: 87,
      yearsExperience: 15,
      location: 'Lagos, Nigeria',
      verified: true,
      certifications: ['COREN', 'NIOB', 'ISO 9001'],
      imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
      priceRange: '₦5M - ₦50M',
    },
    {
      id: 2,
      name: 'Chioma Nwankwo',
      company: 'Elite Builders Nigeria',
      specialization: 'Luxury Homes',
      rating: 4.8,
      reviews: 124,
      projectsCompleted: 63,
      yearsExperience: 12,
      location: 'Abuja, Nigeria',
      verified: true,
      certifications: ['COREN', 'NIOB'],
      imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      priceRange: '₦10M - ₦100M',
    },
    {
      id: 3,
      name: 'Ibrahim Yusuf',
      company: 'Modern Structures Co.',
      specialization: 'Commercial Buildings',
      rating: 4.7,
      reviews: 98,
      projectsCompleted: 52,
      yearsExperience: 10,
      location: 'Port Harcourt, Nigeria',
      verified: true,
      certifications: ['COREN', 'PMP'],
      imageUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400',
      priceRange: '₦8M - ₦75M',
    },
  ];

  const [builders] = useState(mockBuilders);

  const handleRequestQuote = () => {
    setShowQuoteModal(false);
    // Handle quote request submission
    alert('Quote request sent successfully!');
  };

  const renderBuilderCard = ({ item }: { item: Builder }) => (
    <TouchableOpacity
      style={styles.builderCard}
      onPress={() => setSelectedBuilder(item)}
    >
      <View style={styles.cardHeader}>
        <Image source={{ uri: item.imageUrl }} style={styles.builderImage} />
        <View style={styles.builderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.builderName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.verified && (
              <Ionicons name="checkmark-circle" size={18} color="#007AFF" />
            )}
          </View>
          <Text style={styles.companyName} numberOfLines={1}>
            {item.company}
          </Text>
          <Text style={styles.specialization}>{item.specialization}</Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={16} color="#FFD700" />
          <Text style={styles.statText}>
            {item.rating} ({item.reviews})
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="briefcase-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.projectsCompleted} projects</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.statText}>{item.yearsExperience} years</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color="#666" />
        <Text style={styles.locationText}>{item.location}</Text>
      </View>

      <View style={styles.certificationsContainer}>
        {item.certifications.map((cert, index) => (
          <View key={index} style={styles.certBadge}>
            <Ionicons name="ribbon-outline" size={12} color="#007AFF" />
            <Text style={styles.certText}>{cert}</Text>
          </View>
        ))}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.priceRange}>{item.priceRange}</Text>
        <TouchableOpacity
          style={styles.quoteButton}
          onPress={() => {
            setSelectedBuilder(item);
            setShowQuoteModal(true);
          }}
        >
          <Text style={styles.quoteButtonText}>Request Quote</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Find Builders</Text>
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
            placeholder="Search builders, specialization..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>Verified Only</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="location-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>Location</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="pricetag-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>Price Range</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="star-outline" size={16} color="#007AFF" />
          <Text style={styles.filterText}>Rating</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsText}>{builders.length} verified builders</Text>
        <TouchableOpacity>
          <Text style={styles.sortText}>Sort by: Rating</Text>
        </TouchableOpacity>
      </View>

      {/* Builders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={builders}
          renderItem={renderBuilderCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quote Request Modal */}
      <Modal
        visible={showQuoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Quote</Text>
              <TouchableOpacity onPress={() => setShowQuoteModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedBuilder && (
              <View style={styles.builderSummary}>
                <Image
                  source={{ uri: selectedBuilder.imageUrl }}
                  style={styles.modalBuilderImage}
                />
                <View style={styles.modalBuilderInfo}>
                  <Text style={styles.modalBuilderName}>{selectedBuilder.name}</Text>
                  <Text style={styles.modalCompanyName}>{selectedBuilder.company}</Text>
                </View>
              </View>
            )}

            <View style={styles.formSection}>
              <Text style={styles.label}>Project Details</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Describe your project requirements..."
                multiline
                numberOfLines={6}
                value={quoteDetails}
                onChangeText={setQuoteDetails}
                textAlignVertical="top"
              />

              <Text style={styles.helperText}>
                Include project type, location, budget, and timeline
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowQuoteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleRequestQuote}
              >
                <Text style={styles.submitButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  builderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  builderImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E5E5',
  },
  builderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  builderName: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 6,
    flex: 1,
  },
  companyName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  specialization: {
    fontSize: 13,
    color: '#007AFF',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  certificationsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  certText: {
    fontSize: 11,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  priceRange: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  quoteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quoteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  builderSummary: {
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  modalBuilderImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  modalBuilderInfo: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  modalBuilderName: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCompanyName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  formSection: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 120,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
