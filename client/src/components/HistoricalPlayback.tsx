// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Calendar,
  TrendingUp,
  TrendingDown,
  Home,
} from 'lucide-react';

/**
 * Historical Playback Component
 * 
 * Visualizes property price and density changes over time
 * Features animated playback with timeline controls
 */

interface HistoricalPlaybackProps {
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  onTimeChange?: (date: string, data: any) => void;
}

export function HistoricalPlayback({
  bounds,
  onTimeChange,
}: HistoricalPlaybackProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [interval, setInterval] = useState<'month' | 'quarter' | 'year'>('month');

  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 2);

  const { data: snapshotData, isLoading } = trpc.historicalPlayback.getSnapshots.useQuery({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    bounds,
    interval,
  });

  const timeline = snapshotData?.timeline || [];
  const currentPoint = timeline[currentIndex];
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && timeline.length > 0) {
      const delay = 1000 / playbackSpeed;
      playbackIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, delay);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, timeline.length]);

  if (isLoading) {
    return <Card className="p-6"><div className="text-center text-muted-foreground">Loading...</div></Card>;
  }

  if (timeline.length === 0) {
    return <Card className="p-6"><div className="text-center"><Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" /><h4 className="font-medium mb-2">No Historical Data</h4></div></Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-2xl font-bold">{currentPoint?.period}</h3>
            </div>
          </div>
          <Slider value={[currentIndex]} onValueChange={(v) => setCurrentIndex(v[0])} min={0} max={timeline.length - 1} step={1} />
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}><SkipBack className="w-4 h-4" /></Button>
            <Button variant="default" size="icon" className="w-12 h-12" onClick={() => setIsPlaying(!isPlaying)}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentIndex(Math.min(timeline.length - 1, currentIndex + 1))}><SkipForward className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center justify-center gap-4">
            <Label className="text-sm">Speed:</Label>
            <div className="flex gap-2">
              {[1, 2, 5, 10].map((speed) => (
                <Button key={speed} variant={playbackSpeed === speed ? 'default' : 'outline'} size="sm" onClick={() => setPlaybackSpeed(speed)}>{speed}x</Button>
              ))}
            </div>
          </div>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Home className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Properties</h4>
        </div>
        <p className="text-2xl font-bold">{currentPoint?.count.toLocaleString()}</p>
      </Card>
    </div>
  );
}
