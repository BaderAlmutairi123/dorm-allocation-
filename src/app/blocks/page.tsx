"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Copy, Check, UserPlus, Home, Search, Bell } from "lucide-react";
import { authClient } from "@/lib/supabase/auth";

interface BlockMember {
  id: string;
  name: string;
  email: string;
}

interface Block {
  id: string;
  code: string;
  creator: BlockMember;
  members: BlockMember[];
  maxMembers: number;
}

interface PotentialRoommate {
  id: number;
  name: string;
  major: string;
  year: string;
  interests: string;
}

interface NotificationItem {
  id: number;
  roommateName: string;
  roomCode?: string;
  message: string;
  timestamp: string;
}

type TabType = "block" | "roommates" | "notifications";

export default function BlocksPage() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("block");
  const [block, setBlock] = useState<Block | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<BlockMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Set active tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "roommates") {
      setActiveTab("roommates");
    }
  }, [searchParams]);

  // Mock data for potential roommates
  const potentialRoommates: PotentialRoommate[] = [
    { id: 1, name: "John Doe", major: "Computer Science", year: "Sophomore", interests: "Gaming, Music" },
    { id: 2, name: "Jane Smith", major: "Biology", year: "Junior", interests: "Reading, Hiking" },
    { id: 3, name: "Mike Johnson", major: "Engineering", year: "Freshman", interests: "Sports, Movies" },
  ];

  // Filter roommates by name, major, or interests based on the search query
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredRoommates = normalizedQuery
    ? potentialRoommates.filter((roommate) =>
        [roommate.name, roommate.major, roommate.interests]
          .some((field) => field.toLowerCase().includes(normalizedQuery))
      )
    : potentialRoommates;

  const handleSendRequest = (roommate: PotentialRoommate) => {
    const timestamp = new Date().toISOString();

    if (!block) {
      // No room created yet – log a notification indicating this
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now(),
          roommateName: roommate.name,
          message: "No room created",
          timestamp,
        },
      ]);
      setActiveTab("notifications");
      return;
    }

    // Room exists – send invite code in notification
    setNotifications((prev) => [
      ...prev,
      {
        id: Date.now(),
        roommateName: roommate.name,
        roomCode: block.code,
        message: `Invite code ${block.code} sent to ${roommate.name}`,
        timestamp,
      },
    ]);
    setActiveTab("notifications");
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadCurrentUser = async () => {
      try {
        const session = await authClient.getSession();
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
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentUser();
    
    // Fallback timeout to ensure loading doesn't hang forever
    const timeout = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createBlock = () => {
    if (!currentStudent) return;

    const newBlock: Block = {
      id: Date.now().toString(),
      code: generateCode(),
      creator: currentStudent,
      members: [currentStudent],
      maxMembers: 4,
    };
    setBlock(newBlock);
  };

  const joinBlock = () => {
    if (!joinCode.trim() || !currentStudent) return;

    const mockBlock: Block = {
      id: Date.now().toString(),
      code: joinCode.toUpperCase(),
      creator: {
        id: "999",
        name: "John Doe",
        email: "john@university.edu",
      },
      members: [
        {
          id: "999",
          name: "John Doe",
          email: "john@university.edu",
        },
        currentStudent,
      ],
      maxMembers: 4,
    };
    setBlock(mockBlock);
    setJoinCode("");
  };

  const copyCode = () => {
    if (!block) return;
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveBlock = () => {
    setBlock(null);
    setJoinCode("");
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
                variant={activeTab === "roommates" ? "default" : "ghost"}
                onClick={() => setActiveTab("roommates")}
                className="rounded-b-none text-base"
              >
                <Users className="w-5 h-5 mr-2" />
                Find Roommates
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

        {/* Block Tab Content */}
        {activeTab === "block" && (
          <div>
        {/* Create/Join Section */}
        {!block && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="w-5 h-5" />
                Get Started
              </CardTitle>
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
                    <Button onClick={createBlock} className="w-full">
                      Create Block
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
                      disabled={!joinCode.trim()}
                      variant="secondary"
                      className="w-full"
                    >
                      Join Block
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
                    {block.members.length} of {block.maxMembers} members
                  </CardDescription>
                </div>
                <Button
                  onClick={leaveBlock}
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                >
                  Leave Block
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
                              {member.id === block.creator.id && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                  Creator
                                </span>
                              )}
                              {member.id === currentStudent.id && (
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
                  {[...Array(block.maxMembers - block.members.length)].map((_, index) => (
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

        {/* Roommates Tab Content */}
        {activeTab === "roommates" && (
          <Card className="bg-white">
            <CardContent className="pt-6 space-y-8">
              {/* Search Section */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Search className="w-5 h-5" />
                  <h3 className="text-lg font-semibold">Search Roommates</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Find students based on major, interests, or preferences</p>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Label htmlFor="search">Search</Label>
                    <Input
                      id="search"
                      placeholder="Search by name, major, or interests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button>Search</Button>
                  </div>
                </div>
              </div>

              {/* Roommate Requests Section */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-2">My Roommate Requests</h3>
                <p className="text-sm text-muted-foreground mb-4">View pending and accepted requests</p>
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </div>

              {/* Potential Roommates List */}
              <div className="border-t pt-6">
                <h2 className="text-2xl font-semibold mb-4">Potential Roommates</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredRoommates.map((roommate) => (
                    <Card key={roommate.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{roommate.name}</CardTitle>
                        <CardDescription>{roommate.major} • {roommate.year}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium">Interests</p>
                            <p className="text-sm text-muted-foreground">{roommate.interests}</p>
                          </div>
                          <Button
                            className="w-full mt-4"
                            onClick={() => handleSendRequest(roommate)}
                          >
                            Send Request
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {filteredRoommates.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full">
                      No roommates match your search yet.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
                View block invite notifications sent to other students.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No notifications yet. Send a roommate request to see it appear here.
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
                                  : `Request for ${notification.roommateName}`}
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
            </CardContent>
          </Card>
        )}
        </div>
      </div>
    </div>
  );
}
