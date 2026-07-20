/**
 * Innovation 3: Voice-First Property Search
 * Web Speech API + NLP intent parsing for natural language property queries
 * e.g. "Find me a 3 bedroom flat in Lekki under 50 million"
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ParsedIntent {
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  location?: string;
  maxPrice?: number;
  minPrice?: number;
  action?: 'buy' | 'rent';
  amenities?: string[];
}

interface VoiceSearchProps {
  onSearch?: (query: string, intent: ParsedIntent) => void;
  className?: string;
}

// Nigerian location keywords
const NIGERIAN_LOCATIONS = [
  'lekki', 'victoria island', 'vi', 'ikoyi', 'ajah', 'ikeja', 'surulere', 'yaba',
  'abuja', 'maitama', 'asokoro', 'wuse', 'garki', 'port harcourt', 'ph', 'gra',
  'enugu', 'ibadan', 'kano', 'kaduna', 'jos', 'benin', 'warri', 'calabar',
  'banana island', 'chevron', 'osapa', 'sangotedo', 'bogije', 'awoyaya',
];

const PROPERTY_TYPES: Record<string, string> = {
  'flat': 'flat', 'apartment': 'apartment', 'duplex': 'duplex',
  'bungalow': 'bungalow', 'mansion': 'mansion', 'villa': 'villa',
  'terrace': 'terrace', 'semi-detached': 'semi-detached', 'detached': 'detached',
  'studio': 'studio', 'penthouse': 'penthouse', 'land': 'land', 'plot': 'land',
};

function parseNaturalLanguage(text: string): ParsedIntent {
  const lower = text.toLowerCase();
  const intent: ParsedIntent = {};

  // Extract bedrooms
  const bedroomMatch = lower.match(/(\d+)\s*(?:bed(?:room)?s?|br)/);
  if (bedroomMatch) intent.bedrooms = parseInt(bedroomMatch[1]);

  // Extract bathrooms
  const bathroomMatch = lower.match(/(\d+)\s*(?:bath(?:room)?s?)/);
  if (bathroomMatch) intent.bathrooms = parseInt(bathroomMatch[1]);

  // Extract property type
  for (const [keyword, type] of Object.entries(PROPERTY_TYPES)) {
    if (lower.includes(keyword)) { intent.propertyType = type; break; }
  }

  // Extract location (longest match wins)
  let bestLocation = '';
  for (const loc of NIGERIAN_LOCATIONS) {
    if (lower.includes(loc) && loc.length > bestLocation.length) bestLocation = loc;
  }
  if (bestLocation) intent.location = bestLocation.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Extract price (supports "50 million", "50m", "₦50m", "50,000,000")
  const pricePatterns = [
    { re: /(?:under|below|less than|max|maximum|up to)\s*(?:₦|n)?\s*([\d,]+)\s*(million|m|billion|b|k|thousand)?/i, type: 'max' },
    { re: /(?:above|over|more than|min|minimum|at least)\s*(?:₦|n)?\s*([\d,]+)\s*(million|m|billion|b|k|thousand)?/i, type: 'min' },
    { re: /(?:₦|n)\s*([\d,]+)\s*(million|m|billion|b|k|thousand)?/i, type: 'max' },
  ];

  for (const { re, type } of pricePatterns) {
    const match = lower.match(re);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''));
      const unit = (match[2] || '').toLowerCase();
      if (unit === 'billion' || unit === 'b') amount *= 1_000_000_000;
      else if (unit === 'million' || unit === 'm') amount *= 1_000_000;
      else if (unit === 'thousand' || unit === 'k') amount *= 1_000;
      if (type === 'max') intent.maxPrice = amount;
      else intent.minPrice = amount;
      break;
    }
  }

  // Extract action (buy vs rent)
  if (/\b(?:rent|lease|let)\b/.test(lower)) intent.action = 'rent';
  else if (/\b(?:buy|purchase|acquire|own)\b/.test(lower)) intent.action = 'buy';

  // Extract amenities
  const amenityKeywords = ['pool', 'gym', 'parking', 'security', 'generator', 'borehole', 'estate', 'gated'];
  intent.amenities = amenityKeywords.filter(a => lower.includes(a));

  return intent;
}

function intentToDisplayString(intent: ParsedIntent): string {
  const parts: string[] = [];
  if (intent.action) parts.push(intent.action === 'rent' ? 'Rent' : 'Buy');
  if (intent.bedrooms) parts.push(`${intent.bedrooms}-bed`);
  if (intent.propertyType) parts.push(intent.propertyType);
  if (intent.location) parts.push(`in ${intent.location}`);
  if (intent.maxPrice) parts.push(`under ₦${(intent.maxPrice / 1_000_000).toFixed(0)}M`);
  if (intent.minPrice) parts.push(`above ₦${(intent.minPrice / 1_000_000).toFixed(0)}M`);
  if (intent.amenities?.length) parts.push(`with ${intent.amenities.join(', ')}`);
  return parts.join(' ') || 'Any property';
}

const EXAMPLE_QUERIES = [
  '3 bedroom flat in Lekki under 50 million',
  'Buy a duplex in Maitama Abuja with pool',
  'Rent a studio apartment in Yaba',
  '4 bed detached house in GRA Port Harcourt',
];

export function VoiceSearch({ onSearch, className = '' }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [pulseLevel, setPulseLevel] = useState(0);
  const recognitionRef = useRef<any>(null);
  const pulseIntervalRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setIsSupported(false); return; }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-NG';
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      setInterimTranscript(interim);
      if (final) {
        setTranscript(final.trim());
        setInterimTranscript('');
        const intent = parseNaturalLanguage(final);
        setParsedIntent(intent);
      }
    };

    recognition.onerror = (event: any) => {
      setError(event.error === 'not-allowed' ? 'Microphone permission denied. Please allow microphone access.' :
               event.error === 'no-speech' ? 'No speech detected. Please try again.' :
               `Voice recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      clearInterval(pulseIntervalRef.current);
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');
    setParsedIntent(null);
    setIsListening(true);

    // Animate pulse level
    pulseIntervalRef.current = setInterval(() => {
      setPulseLevel(Math.random());
    }, 100);

    try {
      recognitionRef.current.start();
    } catch (e) {
      setError('Could not start voice recognition. Please try again.');
      setIsListening(false);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    clearInterval(pulseIntervalRef.current);
  }, []);

  const handleSearch = useCallback(() => {
    if (!transcript || !parsedIntent) return;
    onSearch?.(transcript, parsedIntent);
  }, [transcript, parsedIntent, onSearch]);

  const handleExampleQuery = useCallback((query: string) => {
    setTranscript(query);
    const intent = parseNaturalLanguage(query);
    setParsedIntent(intent);
  }, []);

  if (!isSupported) {
    return (
      <div className={`p-4 rounded-xl bg-muted text-center ${className}`}>
        <p className="text-sm text-muted-foreground">
          Voice search is not supported in your browser. Please use Chrome or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Microphone button */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          {/* Pulse rings */}
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.5 + pulseLevel * 0.5], opacity: [0.6, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/10"
                animate={{ scale: [1, 2 + pulseLevel * 0.8], opacity: [0.4, 0] }}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
              />
            </>
          )}
          <button
            onClick={isListening ? stopListening : startListening}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-lg transition-all duration-200 ${
              isListening
                ? 'bg-red-500 text-white scale-110'
                : 'bg-primary text-primary-foreground hover:scale-105'
            }`}
            aria-label={isListening ? 'Stop listening' : 'Start voice search'}
            aria-pressed={isListening}
          >
            {isListening ? '⏹' : '🎤'}
          </button>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {isListening
            ? 'Listening... speak your property requirements'
            : 'Tap to search with your voice'}
        </p>
      </div>

      {/* Live transcript */}
      <AnimatePresence>
        {(transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl bg-muted"
          >
            <p className="text-sm font-medium text-foreground">
              {transcript || <span className="text-muted-foreground italic">{interimTranscript}</span>}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed intent display */}
      <AnimatePresence>
        {parsedIntent && Object.keys(parsedIntent).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl border border-primary/20 bg-primary/5"
          >
            <p className="text-xs font-semibold text-primary mb-2">AI understood:</p>
            <p className="text-sm font-medium text-foreground mb-3">{intentToDisplayString(parsedIntent)}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {parsedIntent.bedrooms && <Badge variant="outline">{parsedIntent.bedrooms} bedrooms</Badge>}
              {parsedIntent.propertyType && <Badge variant="outline">{parsedIntent.propertyType}</Badge>}
              {parsedIntent.location && <Badge variant="outline">{parsedIntent.location}</Badge>}
              {parsedIntent.action && <Badge variant="outline">{parsedIntent.action}</Badge>}
              {parsedIntent.maxPrice && <Badge variant="outline">Max ₦{(parsedIntent.maxPrice / 1_000_000).toFixed(0)}M</Badge>}
              {parsedIntent.amenities?.map(a => <Badge key={a} variant="outline">{a}</Badge>)}
            </div>
            <Button size="sm" onClick={handleSearch} className="w-full">
              Search Properties
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20" role="alert">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Example queries */}
      {!transcript && !isListening && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Try saying:</p>
          <div className="space-y-2">
            {EXAMPLE_QUERIES.map(query => (
              <button
                key={query}
                onClick={() => handleExampleQuery(query)}
                className="w-full text-left px-3 py-2 text-xs rounded-lg bg-muted hover:bg-muted/80 transition-colors text-muted-foreground"
                aria-label={`Use example: ${query}`}
              >
                "{query}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VoiceSearch;
