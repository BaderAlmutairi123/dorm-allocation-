"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Check, UserPlus, Home, Building, DoorOpen, LogOut, AlertTriangle, FileText } from "lucide-react";
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

interface RoomAssignment {
  room_number?: string;
  room_type?: string;
  dorm_name?: string;
  status?: string;
  roommates?: BlockMember[];
}

export default function BlocksPage() {
  const router = useRouter();
  const [block, setBlock] = useState<Block | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<BlockMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [roomAssignment, setRoomAssignment] = useState<RoomAssignment | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [hasApplication, setHasApplication] = useState<boolean | null>(null);

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

            // First check if user has submitted an application (check for student record)
            const studentResponse = await fetch(`/api/students/${user.id}`, { headers: authHeaders });
            if (studentResponse.ok) {
              const studentData = await studentResponse.json();
              // Check if the student has phone/gender set (required fields from application)
              if (studentData.phone && studentData.gender) {
                setHasApplication(true);
              } else {
                setHasApplication(false);
                setIsLoading(false);
                return; // Don't load block data if no application
              }
            } else {
              setHasApplication(false);
              setIsLoading(false);
              return; // Don't load block data if no application
            }
            
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
    setSuccessMessage(null);
    setIsCreating(true);

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
          setSuccessMessage('Block created successfully! Share your code with friends.');
        }
      }
    } catch (error: any) {
      console.error('Error creating block:', error);
      setError(error.message || 'Failed to create block');
    } finally {
      setIsCreating(false);
    }
  };

  const joinBlock = async () => {
    if (!joinCode.trim() || !currentStudent) return;
    setError(null);
    setSuccessMessage(null);
    setIsJoining(true);

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

      // Reload block and room assignment data
      const blockResponse = await fetch('/api/blocks', { headers: authHeaders });
      if (blockResponse.ok) {
        const blockData = await blockResponse.json();
        if (blockData.block) {
          setBlock(blockData.block);
          setJoinCode("");
          setSuccessMessage('Successfully joined the block! You\'ve been assigned to the same room as your block members.');
        }
      }

      // Reload room assignment
      const user = await authClient.getUser();
      if (user) {
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
    } catch (error: any) {
      console.error('Error joining block:', error);
      setError(error.message || 'Failed to join block');
    } finally {
      setIsJoining(false);
    }
  };

  const copyCode = () => {
    if (!block) return;
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveBlock = async () => {
    if (!block || !currentStudent) return;
    setIsLeaving(true);
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

      // Clear block and room assignment state
      setBlock(null);
      setRoomAssignment(null);
      setShowLeaveConfirm(false);
      setSuccessMessage('You have left the block. Your room assignment has been reset.');
    } catch (error: any) {
      console.error('Error leaving block:', error);
      setError(error.message || 'Failed to leave block');
    } finally {
      setIsLeaving(false);
    }
  };

  // Determine if user has a confirmed room without being in a block (matched by algorithm)
  const hasConfirmedRoomWithoutBlock = !block && roomAssignment && roomAssignment.status === 'Confirmed';
  
  // Determine if user is the block leader
  const isBlockLeader = block && currentStudent && block.creator?.id === currentStudent.id;


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

  // Show message if user hasn't submitted an application yet
  if (hasApplication === false) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <FileText className="w-6 h-6" />
                  Application Required
                </CardTitle>
                <CardDescription className="text-amber-700">
                  You need to submit a room application before you can access blocks.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-amber-900">
                  To create or join a block with friends, you must first complete your dorm room application. 
                  This helps us match you with the right room and roommates.
                </p>
                <div className="flex gap-4">
                  <Button asChild>
                    <Link href="/application">Submit Application</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                </div>
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
      <div className="max-w-4xl mx-auto">
        {/* Title Section */}
        <Card className="mb-6 bg-white">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold mb-2">My Block</h1>
              <p className="text-muted-foreground">
                {block 
                  ? 'View your block members and share your invite code'
                  : hasConfirmedRoomWithoutBlock
                    ? 'You\'ve been assigned a room through our matching system'
                    : 'Create a block to room with friends or join an existing one'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Success Message */}
        {successMessage && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <p className="text-green-700 flex items-center gap-2">
                <Check className="w-5 h-5" />
                {successMessage}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Error Message */}
        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <p className="text-red-700">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2 text-red-600"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SCENARIO 1: User has a confirmed room without being in a block (matched by algorithm) */}
        {hasConfirmedRoomWithoutBlock && (
          <Card className="mb-6 border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <DoorOpen className="w-5 h-5" />
                Your Room Assignment
              </CardTitle>
              <CardDescription className="text-green-700">
                You&apos;ve been matched and assigned to a room! View your details below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Building</p>
                  </div>
                  <p className="font-semibold text-lg">{roomAssignment?.dorm_name || 'N/A'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <DoorOpen className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Room</p>
                  </div>
                  <p className="font-semibold text-lg">{roomAssignment?.room_number || 'N/A'}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-1">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Room Type</p>
                  </div>
                  <p className="font-semibold text-lg">{roomAssignment?.room_type || 'N/A'}</p>
                </div>
              </div>

              {/* Roommates */}
              {roomAssignment?.roommates && roomAssignment.roommates.length > 0 && (
                <div className="border-t border-green-200 pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2 text-green-800">
                    <Users className="w-4 h-4" />
                    Your Roommates ({roomAssignment.roommates.length})
                  </h4>
                  <div className="space-y-2">
                    {roomAssignment.roommates.map((roommate) => (
                      <div key={roommate.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
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

              {(!roomAssignment?.roommates || roomAssignment.roommates.length === 0) && (
                <div className="border-t border-green-200 pt-4">
                  <p className="text-sm text-green-700">
                    No roommates assigned yet. You may be the first person in this room!
                  </p>
                </div>
              )}

              <div className="border-t border-green-200 pt-4">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/assignment">View Full Room Details</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SCENARIO 2: User is NOT in a block and has no confirmed room - Show Create/Join options */}
        {!block && !hasConfirmedRoomWithoutBlock && (
          <Card className="mb-6 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Get Started with Blocks
              </CardTitle>
              <CardDescription>
                Want to room with friends? Create a block and share the code, or join an existing block with a code from your friend.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Create Block */}
                <Card className="border-2 hover:border-primary transition hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-primary" />
                      Create New Block
                    </CardTitle>
                    <CardDescription>
                      Start a new block and invite your friends to join you
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• You&apos;ll get a unique 6-character code</li>
                        <li>• Share the code with up to 3 friends</li>
                        <li>• Everyone in the block gets the same room</li>
                      </ul>
                      <Button onClick={createBlock} className="w-full" disabled={isCreating}>
                        {isCreating ? 'Creating...' : 'Create Block'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Join Block */}
                <Card className="border-2 hover:border-primary transition hover:shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      Join Existing Block
                    </CardTitle>
                    <CardDescription>
                      Have a code from a friend? Enter it below to join their block
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="text"
                      placeholder="Enter 6-character code"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(e.target.value.toUpperCase());
                        setError(null);
                      }}
                      maxLength={6}
                      className="uppercase text-center text-lg tracking-widest font-mono"
                    />
                    <Button
                      onClick={joinBlock}
                      disabled={joinCode.length !== 6 || isJoining}
                      variant="secondary"
                      className="w-full"
                    >
                      {isJoining ? 'Joining...' : 'Join Block'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SCENARIO 3: User IS in a block - Show block details */}
        {block && (
          <>
            {/* Room Assignment Card (if block has a room) */}
            {roomAssignment && roomAssignment.room_number && (
              <Card className="mb-6 border-2 border-green-200 bg-green-50">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-800">
                    <DoorOpen className="w-5 h-5" />
                    Your Block&apos;s Room
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Building</p>
                      <p className="font-semibold">{roomAssignment.dorm_name || 'N/A'}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Room</p>
                      <p className="font-semibold">{roomAssignment.room_number}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <p className="font-semibold text-green-600">{roomAssignment.status || 'Pending'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leave Block Confirmation Modal */}
            {showLeaveConfirm && (
              <Card className="mb-6 border-2 border-amber-400 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <AlertTriangle className="w-5 h-5" />
                    Leave Block?
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border border-amber-200">
                    <p className="text-amber-900 font-medium">
                      ⚠️ If you leave your block, you will have to do your room assignment again.
                    </p>
                    <p className="text-sm text-amber-700 mt-2">
                      Your current room assignment will be reset and you&apos;ll need to either join a new block or be assigned through the matching system.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowLeaveConfirm(false)}
                      className="flex-1"
                      disabled={isLeaving}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={leaveBlock}
                      className="flex-1"
                      disabled={isLeaving}
                    >
                      {isLeaving ? 'Leaving...' : 'Yes, Leave Block'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Block Info Card */}
            <Card className="bg-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5" />
                      Your Block
                    </CardTitle>
                    <CardDescription>
                      {block.members?.length || 0} of {block.maxMembers || 4} members
                      {isBlockLeader && ' • You are the block leader'}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowLeaveConfirm(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Block
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invite Code Box */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Your Block&apos;s Invite Code</p>
                        <p className="text-4xl font-bold tracking-widest font-mono text-primary">{block.code}</p>
                      </div>
                      <Button
                        onClick={copyCode}
                        variant={copied ? "default" : "outline"}
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
                      Share this code with friends so they can join your block
                    </p>
                  </CardContent>
                </Card>

                {/* Members List */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Block Members ({block.members?.length || 0}/{block.maxMembers || 4})
                  </h3>
                  <div className="space-y-3">
                    {block.members.map((member) => (
                      <Card key={member.id} className={`border ${member.id === currentStudent?.id ? 'border-green-300 bg-green-50' : ''}`}>
                        <CardContent className="py-4">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${member.is_leader || member.id === block.creator?.id ? 'bg-primary' : 'bg-gray-500'}`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold flex items-center gap-2 flex-wrap">
                                {member.name}
                                {(member.is_leader || member.id === block.creator?.id) && (
                                  <span className="text-xs bg-primary text-white px-2 py-0.5 rounded">
                                    Leader
                                  </span>
                                )}
                                {member.id === currentStudent?.id && (
                                  <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded">
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
                      <Card key={`empty-${index}`} className="border-2 border-dashed border-gray-200 bg-gray-50">
                        <CardContent className="py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              <UserPlus className="w-6 h-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-400">Empty Slot</p>
                              <p className="text-sm text-gray-400">Share your code to invite a friend</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Helpful tip */}
                {(block.members?.length || 0) < (block.maxMembers || 4) && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Tip:</strong> You have {(block.maxMembers || 4) - (block.members?.length || 0)} empty slot(s). 
                      Share your code <span className="font-mono font-bold">{block.code}</span> with friends to fill your block!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
