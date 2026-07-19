import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users } from 'lucide-react';

interface VideoCallProps {
  roomName: string;
  displayName: string;
  propertyId?: number;
  propertyTitle?: string;
  onCallEnd?: () => void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function VideoCall({
  roomName,
  displayName,
  propertyId,
  propertyTitle,
  onCallEnd,
}: VideoCallProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<any>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    // Load Jitsi Meet External API script
    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => initializeJitsi();
      document.body.appendChild(script);
    };

    const initializeJitsi = () => {
      if (!jitsiContainerRef.current || api) return;

      const domain = 'meet.jit.si'; // Use self-hosted domain in production
      const options = {
        roomName: roomName,
        width: '100%',
        height: 600,
        parentNode: jitsiContainerRef.current,
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          disableModeratorIndicator: false,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          disableInviteFunctions: false,
          toolbarButtons: [
            'camera',
            'chat',
            'closedcaptions',
            'desktop',
            'download',
            'embedmeeting',
            'etherpad',
            'feedback',
            'filmstrip',
            'fullscreen',
            'hangup',
            'help',
            'highlight',
            'invite',
            'linktosalesforce',
            'livestreaming',
            'microphone',
            'noisesuppression',
            'participants-pane',
            'profile',
            'raisehand',
            'recording',
            'security',
            'select-background',
            'settings',
            'shareaudio',
            'sharedvideo',
            'shortcuts',
            'stats',
            'tileview',
            'toggle-camera',
            'videoquality',
            'whiteboard',
          ],
        },
        interfaceConfigOverwrite: {
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          DEFAULT_BACKGROUND: '#1a1a1a',
          TOOLBAR_ALWAYS_VISIBLE: false,
          MOBILE_APP_PROMO: false,
        },
        userInfo: {
          displayName: displayName,
        },
      };

      const jitsiApi = new window.JitsiMeetExternalAPI(domain, options);

      // Event listeners
      jitsiApi.addEventListener('videoConferenceJoined', () => {
        console.log('Video conference joined');
      });

      jitsiApi.addEventListener('videoConferenceLeft', () => {
        console.log('Video conference left');
        if (onCallEnd) onCallEnd();
      });

      jitsiApi.addEventListener('participantJoined', (participant: any) => {
        console.log('Participant joined:', participant);
        setParticipantCount((prev) => prev + 1);
      });

      jitsiApi.addEventListener('participantLeft', (participant: any) => {
        console.log('Participant left:', participant);
        setParticipantCount((prev) => Math.max(1, prev - 1));
      });

      jitsiApi.addEventListener('audioMuteStatusChanged', (event: any) => {
        setIsAudioMuted(event.muted);
      });

      jitsiApi.addEventListener('videoMuteStatusChanged', (event: any) => {
        setIsVideoMuted(event.muted);
      });

      jitsiApi.addEventListener('screenSharingStatusChanged', (event: any) => {
        setIsScreenSharing(event.on);
      });

      setApi(jitsiApi);
    };

    loadJitsiScript();

    return () => {
      if (api) {
        api.dispose();
      }
    };
  }, [roomName, displayName]);

  const toggleAudio = () => {
    if (api) {
      api.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (api) {
      api.executeCommand('toggleVideo');
    }
  };

  const toggleScreenShare = () => {
    if (api) {
      api.executeCommand('toggleShareScreen');
    }
  };

  const hangUp = () => {
    if (api) {
      api.executeCommand('hangup');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Video Call</span>
          <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>
          </div>
        </CardTitle>
        {propertyTitle && (
          <CardDescription>
            Virtual tour for: {propertyTitle}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Jitsi Meet Container */}
        <div
          ref={jitsiContainerRef}
          className="w-full rounded-lg overflow-hidden bg-black"
          style={{ minHeight: '600px' }}
        />

        {/* Custom Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={isAudioMuted ? 'destructive' : 'default'}
            size="icon"
            onClick={toggleAudio}
            title={isAudioMuted ? 'Unmute' : 'Mute'}
          >
            {isAudioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Button
            variant={isVideoMuted ? 'destructive' : 'default'}
            size="icon"
            onClick={toggleVideo}
            title={isVideoMuted ? 'Start Video' : 'Stop Video'}
          >
            {isVideoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>

          <Button
            variant={isScreenSharing ? 'secondary' : 'default'}
            size="icon"
            onClick={toggleScreenShare}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            <Monitor className="h-4 w-4" />
          </Button>

          <Button
            variant="destructive"
            size="icon"
            onClick={hangUp}
            title="End Call"
          >
            <PhoneOff className="h-4 w-4" />
          </Button>
        </div>

        {/* Call Info */}
        <div className="text-sm text-muted-foreground text-center">
          <p>Room: {roomName}</p>
          {propertyId && <p>Property ID: #{propertyId}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
