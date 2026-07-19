import { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { VideoConference } from '@/components/VideoConference';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Video } from 'lucide-react';
import { Link } from 'wouter';

export default function VideoTourRoom() {
  const [, params] = useRoute('/video-tour/:roomId');
  const { user, loading } = useAuth();
  const [inCall, setInCall] = useState(false);
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    if (params?.roomId) {
      setRoomName(params.roomId);
    }
  }, [params]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to join the video tour</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/api/oauth/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inCall) {
    return (
      <div className="h-screen w-screen">
        <VideoConference
          roomName={roomName}
          displayName={user.name || user.email || 'Guest'}
          onClose={() => setInCall(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-4xl mx-auto">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-6 w-6" />
              Virtual Property Tour
            </CardTitle>
            <CardDescription>
              Join a live video tour with an agent to explore the property remotely
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Room: {roomName}</h3>
              <p className="text-sm text-muted-foreground">
                You will join as: <span className="font-medium">{user.name || user.email}</span>
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Before you join:</h4>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                <li>Make sure your camera and microphone are working</li>
                <li>Find a quiet place with good lighting</li>
                <li>Use headphones to prevent echo</li>
                <li>Have a stable internet connection</li>
                <li>Prepare any questions you have about the property</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Features:</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">HD Video & Audio</p>
                    <p className="text-xs text-muted-foreground">Crystal clear communication</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Screen Sharing</p>
                    <p className="text-xs text-muted-foreground">View documents together</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Chat</p>
                    <p className="text-xs text-muted-foreground">Send messages during the tour</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="h-2 w-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Recording</p>
                    <p className="text-xs text-muted-foreground">Save the tour for later</p>
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={() => setInCall(true)} className="w-full" size="lg">
              <Video className="mr-2 h-5 w-5" />
              Join Video Tour
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By joining, you agree to our video conferencing terms and privacy policy
            </p>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Camera/Microphone not working?</strong> Check your browser permissions and
              make sure no other app is using them.
            </p>
            <p>
              <strong>Connection issues?</strong> Try refreshing the page or switching to a
              different network.
            </p>
            <p>
              <strong>Can't hear the agent?</strong> Check your volume settings and make sure your
              speakers/headphones are connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
