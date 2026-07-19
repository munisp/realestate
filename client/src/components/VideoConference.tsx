import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Settings } from 'lucide-react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface VideoConferenceProps {
  roomName: string;
  displayName: string;
  propertyId?: string;
  onClose?: () => void;
  jitsiDomain?: string;
}

export function VideoConference({
  roomName,
  displayName,
  propertyId,
  onClose,
  jitsiDomain = 'meet.jit.si', // Can be self-hosted Jitsi instance
}: VideoConferenceProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load Jitsi Meet External API script
    const script = document.createElement('script');
    script.src = `https://${jitsiDomain}/external_api.js`;
    script.async = true;
    script.onload = () => initializeJitsi();
    document.body.appendChild(script);

    return () => {
      if (api) {
        api.dispose();
      }
      document.body.removeChild(script);
    };
  }, []);

  const initializeJitsi = () => {
    if (!jitsiContainerRef.current || !window.JitsiMeetExternalAPI) return;

    const options = {
      roomName: `realestate-${roomName}${propertyId ? `-${propertyId}` : ''}`,
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false,
        disableDeepLinking: true,
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'profile',
          'chat',
          'recording',
          'livestreaming',
          'etherpad',
          'sharedvideo',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'feedback',
          'stats',
          'shortcuts',
          'tileview',
          'download',
          'help',
          'mute-everyone',
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false,
        DEFAULT_BACKGROUND: '#1a1a1a',
        DISABLE_VIDEO_BACKGROUND: false,
        SHOW_CHROME_EXTENSION_BANNER: false,
      },
      userInfo: {
        displayName: displayName,
      },
    };

    const jitsiApi = new window.JitsiMeetExternalAPI(jitsiDomain, options);

    // Event listeners
    jitsiApi.addEventListener('videoConferenceJoined', () => {
      console.log('Joined video conference');
      setIsLoading(false);
    });

    jitsiApi.addEventListener('videoConferenceLeft', () => {
      console.log('Left video conference');
      if (onClose) onClose();
    });

    jitsiApi.addEventListener('audioMuteStatusChanged', (event: any) => {
      setIsAudioMuted(event.muted);
    });

    jitsiApi.addEventListener('videoMuteStatusChanged', (event: any) => {
      setIsVideoMuted(event.muted);
    });

    setApi(jitsiApi);
  };

  const toggleVideo = () => {
    if (api) {
      api.executeCommand('toggleVideo');
    }
  };

  const toggleAudio = () => {
    if (api) {
      api.executeCommand('toggleAudio');
    }
  };

  const hangUp = () => {
    if (api) {
      api.executeCommand('hangup');
    }
    if (onClose) onClose();
  };

  return (
    <Card className="w-full h-full flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Connecting to video conference...</p>
          </div>
        </div>
      )}

      <div ref={jitsiContainerRef} className="flex-1 relative" />

      {/* Custom controls overlay (optional) */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-background/90 p-2 rounded-lg shadow-lg">
        <Button
          variant={isVideoMuted ? 'destructive' : 'default'}
          size="icon"
          onClick={toggleVideo}
          title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
        >
          {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </Button>

        <Button
          variant={isAudioMuted ? 'destructive' : 'default'}
          size="icon"
          onClick={toggleAudio}
          title={isAudioMuted ? 'Unmute' : 'Mute'}
        >
          {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button variant="destructive" size="icon" onClick={hangUp} title="End call">
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

/**
 * Simple WebRTC peer-to-peer video call (without Jitsi)
 * For direct 1-on-1 calls
 */
export function SimpleVideoCall({
  localStream,
  remoteStream,
  onEndCall,
}: {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Remote video (main) */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />

      {/* Local video (picture-in-picture) */}
      <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-background/90 p-2 rounded-lg shadow-lg">
        <Button
          variant={isVideoMuted ? 'destructive' : 'default'}
          size="icon"
          onClick={toggleVideo}
        >
          {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </Button>

        <Button
          variant={isAudioMuted ? 'destructive' : 'default'}
          size="icon"
          onClick={toggleAudio}
        >
          {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        <Button variant="destructive" size="icon" onClick={onEndCall}>
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>

      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}
