"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Check, UserPlus, Home, Bell } from "lucide-react";
import { authClient } from "@/lib/supabase/auth";

interface BlockMember {
  id: string;
  name: string;
  email: string;
  is_leader?: boolean;
}

interface Block {
  id: string;
  code: string;
  creator?: BlockMember;
  members: BlockMember[];
  maxMembers: number;
}


interface NotificationItem {
  id: number;
  roommateName: string;
  roomCode?: string;
  message: string;
  timestamp: string;
}

interface ReceivedRequest {
  request_id: number;
  sender: {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  block_code?: string;
  message?: string;
  status: string;
  created_at: string;
}

type TabType = "block" | "notifications";

export default function BlocksPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("block");
  const [block, setBlock] = useState<Block | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<BlockMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [receivedRequests, setReceivedRequests] = useState<ReceivedRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [roomAssignment, setRoomAssignment] = useState<{
    room_number?: string;
    room_type?: string;
    dorm_name?: string;
    status?: string;
    roommates?: BlockMember[];
  } | null>(null);



  // Load user and their block
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const session = await authClient.getSession();
        if (!session) {
          if (isMounted) {
            router.push('/sign-in');
          }
          return;
        }

        if (session && isMounted) {
          const user = await authClient.getUser();
          if (user && isMounted) {
            const firstName = user.user_metadata?.first_name || "";
            const lastName = user.user_metadata?.last_name || "";
            const name = `${firstName} ${lastName}`.trim() || user.email?.split("@")[0] || "You";

            setCurrentStudent({
              id: user.id,
              name,
              email: user.email || "",
            });

            // Load user's block
            const session = await authClient.getSession();
            const authHeaders: HeadersInit = session?.access_token 
              ? { 'Authorization': `Bearer ${session.access_token}` } 
              : {};
            
            const blockResponse = await fetch('/api/blocks', { headers: authHeaders });
            if (blockResponse.ok) {
              const blockData = await blockResponse.json();
              if (blockData.block) {
                setBlock(blockData.block);
              }
            }

            // Also load room assignment to show roommates even without a formal block
            const assignmentResponse = await fetch(`/api/assignments/${user.id}`, { headers: authHeaders });
            if (assignmentResponse.ok) {
              const assignmentData = await assignmentResponse.json();
              if (assignmentData.assignment && assignmentData.assignment.room) {
                setRoomAssignment({
                  room_number: assignmentData.assignment.room.room_number,
                  room_type: assignmentData.assignment.room.room_type,
                  dorm_name: assignmentData.assignment.room.dorm?.dorm_name,
                  status: assignmentData.assignment.status,
                  roommates: assignmentData.assignment.roommates?.map((r: any) => ({
                    id: r.student_id,
                    name: `${r.first_name} ${r.last_name}`,
                    email: r.email,
                  })) || [],
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
        if (isMounted) {
          router.push('/sign-in');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [router]);

  const createBlock = async () => {
    if (!currentStudent) return;
    setError(null);

    try {
      const session = await authClient.getSession();
      const headers: HeadersInit = session?.access_token 
        ? { 'Authorization': `Bearer ${session.access_token}` } 
        : {};

      const response = await fetch('/api/blocks', {
        method: 'POST',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create block');
        return;
      }

      // Reload block data
      const blockResponse = await fetch('/api/blocks', { headers });
      if (blockResponse.ok) {
        const blockData = await blockResponse.json();
        if (blockData.block) {
          setBlock(blockData.block);
        }
      }
    } catch (error: any) {
      console.error('Error creating block:', error);
      setError(error.message || 'Failed to create block');
    }
  };

  const joinBlock = async () => {
    if (!joinCode.trim() || !currentStudent) return;
    setError(null);

    try {
      const session = await authClient.getSession();
      const authHeaders: HeadersInit = session?.access_token 
        ? { 'Authorization': `Bearer ${session.access_token}` } 
        : {};

      const response = await fetch('/api/blocks/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ code: joinCode.toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join block');
        return;
      }

      // Reload block data
      const blockResponse = await fetch('/api/blocks', { headers: authHeaders });
      if (blockResponse.ok) {
        const blockData = await blockResponse.json();
        if (blockData.block) {
          setBlock(blockData.block);
          setJoinCode("");
        }
      }
    } catch (error: any) {
      console.error('Error joining block:', error);
      setError(error.message || 'Failed to join block');
    }
  };

  const copyCode = () => {
    if (!block) return;
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveBlock = async () => {
    if (!block) return;
    setError(null);

    try {
      const session = await authClient.getSession();
      const headers: HeadersInit = session?.access_token 
        ? { 'Authorization': `Bearer ${session.access_token}` } 
        : {};

      const response = await fetch(`/api/blocks/${block.id}`, {
        method: 'DELETE',
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to leave block');
        return;
      }

      setBlock(null);
      setJoinCode("");
    } catch (error: any) {
      console.error('Error leaving block:', error);
      setError(error.message || 'Failed to leave block');
    }
  };

  // Load received requests when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications' && !isLoadingRequests) {
      setIsLoadingRequests(true);
      const loadRequests = async () => {
        try {
          const session = await authClient.getSession();
          const headers: HeadersInit = session?.access_token 
            ? { 'Authorization': `Bearer ${session.access_token}` } 
            : {};
          
          const response = await fetch('/api/roommate-requests', { headers });
          if (response.ok) {
            const data = await response.json();
            setReceivedRequests(data.received?.filter((r: ReceivedRequest) => r.status === 'Pending') || []);
          }
        } catch (error) {
          // Silently fail - table might not exist yet
        } finally {
          setIsLoadingRequests(false);
        }
      };
      loadRequests();
    }
  }, [activeTab]);

  const handleRespondToRequest = async (requestId: number, status: 'Accepted' | 'Declined') => {
    try {
      const session = await authClient.getSession();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
      };

      const response = await fetch(`/api/roommate-requests/${requestId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Remove from received requests
        setReceivedRequests(prev => prev.filter(r => r.request_id !== requestId));
        
        // Add notification
        const request = receivedRequests.find(r => r.request_id === requestId);
        if (request) {
          setNotifications(prev => [
            ...prev,
            {
              id: Date.now(),
              roommateName: `${request.sender.first_name} ${request.sender.last_name}`,
              message: status === 'Accepted' 
                ? `You accepted ${request.sender.first_name}'s roommate request!`
                : `You declined ${request.sender.first_name}'s roommate request.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }

        // Reload block data if accepted
        if (status === 'Accepted') {
          const blockResponse = await fetch('/api/blocks', { headers });
          if (blockResponse.ok) {
            const blockData = await blockResponse.json();
            if (blockData.block) {
              setBlock(blockData.block);
            }
          }
        }
      }
    } catch (error) {
      setError('Failed to respond to request');
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Authentication Required</CardTitle>
                <CardDescription>Please sign in to access the block manager.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Title Section */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">Blocks & Roommates</h1>
              <p className="text-muted-foreground">
                Manage your student block or find potential roommates
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-6">
            <div className="flex gap-6 border-b">
              <Button
                variant={activeTab === "block" ? "default" : "ghost"}
                onClick={() => setActiveTab("block")}
                className="rounded-b-none text-base"
              >
                <Home className="w-5 h-5 mr-2" />
                My Block
              </Button>
              <Button
                variant={activeTab === "notifications" ? "default" : "ghost"}
                onClick={() => setActiveTab("notifications")}
                className="rounded-b-none text-base"
              >
                <Bell className="w-5 h-5 mr-2" />
                Notifications
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Block Tab Content */}
        {activeTab === "block" && (
          <div>
        {/* Room Assignment Info (when user has a room but no block) */}
        {!block && roomAssignment && roomAssignment.status === 'Confirmed' && (
          <Card className="mb-6 border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Home className="w-5 h-5" />
                Your Room Assignment
              </CardTitle>
              <CardDescription className="text-green-700">
                You&apos;ve been assigned to a room! Here are your details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Building</p>
                  <p className="font-semibold">{roomAssignment.dorm_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room</p>
                  <p className="font-semibold">{roomAssignment.room_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room Type</p>
                  <p className="font-semibold">{roomAssignment.room_type || 'N/A'}</p>
                </div>
              </div>

              {/* Roommates */}
              {roomAssignment.roommates && roomAssignment.roommates.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Your Roommates ({roomAssignment.roommates.length})
                  </h4>
                  <div className="space-y-2">
                    {roomAssignment.roommates.map((roommate) => (
                      <div key={roommate.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                          {roommate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{roommate.name}</p>
                          <p className="text-sm text-muted-foreground">{roommate.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!roomAssignment.roommates || roomAssignment.roommates.length === 0) && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    No roommates assigned yet. You may be the first person in this room!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create/Join Section */}
        {!block && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                {roomAssignment ? 'Want to Form a Block?' : 'Get Started'}
              </CardTitle>
              {roomAssignment && (
                <CardDescription>
                  Create or join a block to coordinate with friends for future housing
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Create Block */}
                <Card className="border-2 hover:border-primary transition">
          <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Create New Block
                    </CardTitle>
                    <CardDescription>
                      Start a new private room and invite your friends to join
                    </CardDescription>
          </CardHeader>
          <CardContent>
                    <Button onClick={createBlock} className="w-full" disabled={isLoading}>
                      {isLoading ? 'Creating...' : 'Create Block'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Join Block */}
                <Card className="border-2 hover:border-primary transition">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Join Existing Block
                    </CardTitle>
                    <CardDescription>
                      Enter the invite code shared by your friend
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Enter code (e.g., ABC123)"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="uppercase"
                    />
                    <Button
                      onClick={joinBlock}
                      disabled={!joinCode.trim() || isLoading}
                      variant="secondary"
                      className="w-full"
                    >
                      {isLoading ? 'Joining...' : 'Join Block'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Block Display Section */}
        {block && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
              <div>
                  <CardTitle>Your Block</CardTitle>
                  <CardDescription>
                    {block.members?.length || 0} of {block.maxMembers || 4} members
                  </CardDescription>
                </div>
                <Button
                  onClick={leaveBlock}
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={isLoading}
                >
                  {isLoading ? 'Leaving...' : 'Leave Block'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Invite Code Box */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Invite Code</p>
                      <p className="text-3xl font-bold tracking-wider">{block.code}</p>
                    </div>
                    <Button
                      onClick={copyCode}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </Button>
            </div>
                  <p className="text-sm text-muted-foreground">
                    Share this code with friends to invite them to your block
                  </p>
                </CardContent>
              </Card>

              {/* Members List */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Block Members
                </h3>
                <div className="space-y-3">
                  {block.members.map((member) => (
                    <Card key={member.id} className="border">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-lg">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold flex items-center gap-2">
                              {member.name}
                              {(member.is_leader || member.id === block.creator?.id) && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  Creator
                                </span>
                              )}
                              {member.id === currentStudent?.id && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
          </div>
        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Empty Slots */}
                  {[...Array(Math.max(0, (block.maxMembers || 4) - (block.members?.length || 0)))].map((_, index) => (
                    <Card key={`empty-${index}`} className="border-2 border-dashed">
                  <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-muted-foreground">Empty Slot</p>
                            <p className="text-sm text-muted-foreground">Waiting for member...</p>
                          </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
            </CardContent>
          </Card>
        )}
          </div>
        )}

        {/* Notifications Tab Content */}
        {activeTab === "notifications" && (
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                View and respond to roommate requests.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pending Requests */}
              {receivedRequests.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-primary">
                    Pending Requests ({receivedRequests.length})
                  </h3>
                  <div className="space-y-3">
                    {receivedRequests.map((request) => (
                      <Card key={request.request_id} className="border-2 border-primary/20 bg-primary/5">
                        <CardContent className="py-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className="font-semibold">
                                {request.sender.first_name} {request.sender.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.sender.email}
                              </p>
                              {request.message && (
                                <p className="text-sm mt-2 italic">"{request.message}"</p>
                              )}
                              {request.block_code && (
                                <p className="text-sm mt-1">
                                  Block code: <span className="font-mono font-bold">{request.block_code}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRespondToRequest(request.request_id, 'Accepted')}
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRespondToRequest(request.request_id, 'Declined')}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Log */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Activity Log</h3>
                {notifications.length === 0 && receivedRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No notifications yet. Send a roommate request to see it appear here.
                  </p>
                ) : notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No recent activity.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {notifications
                      .slice()
                      .reverse()
                      .map((notification) => (
                        <Card key={notification.id} className="border">
                          <CardContent className="py-4">
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className="font-semibold">
                                  {notification.roomCode
                                    ? `Invite sent to ${notification.roommateName}`
                                    : notification.roommateName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {notification.message}
                                  {notification.roomCode && (
                                    <span className="ml-2 font-mono font-medium">
                                      ({notification.roomCode})
                                    </span>
                                  )}
                                </p>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(notification.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}
