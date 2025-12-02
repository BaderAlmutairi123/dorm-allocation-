"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Copy, Check, UserPlus, Home, AlertCircle, CheckCircle } from "lucide-react";
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

// API helper functions for block operations
const blockAPI = {
  async getUserBlock(studentId: string): Promise<Block | null> {
    const response = await fetch(`/api/blocks?studentId=${studentId}`)
    if (!response.ok) {
      throw new Error('Failed to fetch block')
    }
    const data = await response.json()
    return data.block
  },

  async createBlock(studentId: string, firstName: string, lastName: string, email: string): Promise<Block> {
    const response = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        studentId,
        firstName,
        lastName,
        email,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create block')
    }

    const data = await response.json()
    return data.block
  },

  async joinBlock(studentId: string, firstName: string, lastName: string, email: string, code: string): Promise<Block> {
    const response = await fetch('/api/blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        studentId,
        firstName,
        lastName,
        email,
        code,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to join block')
    }

    const data = await response.json()
    return data.block
  },

  async leaveBlock(studentId: string): Promise<{ success: boolean; message?: string }> {
    const response = await fetch(`/api/blocks?studentId=${studentId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to leave block')
    }

    return await response.json()
  },
};

export default function BlocksPage() {
  const router = useRouter();
  const [block, setBlock] = useState<Block | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<BlockMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
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

            const studentData = {
              id: user.id,
              name,
              email: user.email || "",
            };

            setCurrentStudent(studentData);

            // Check if user already has a block from database
            try {
              const existingBlock = await blockAPI.getUserBlock(user.id);
              if (existingBlock) {
                setBlock(existingBlock);
              }
            } catch (error) {
              console.error('Error fetching user block:', error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading user:", error);
        if (isMounted) {
          router.push('/sign-in');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentUser();

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

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const [firstName, ...lastNameParts] = currentStudent.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const newBlock = await blockAPI.createBlock(
        currentStudent.id,
        firstName,
        lastName,
        currentStudent.email
      );

      setBlock(newBlock);
    } catch (err) {
      console.error('Error creating block:', err);
      setError(err instanceof Error ? err.message : 'Failed to create block. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const joinBlock = async () => {
    if (!joinCode.trim() || !currentStudent) return;

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      const [firstName, ...lastNameParts] = currentStudent.name.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      const joinedBlock = await blockAPI.joinBlock(
        currentStudent.id,
        firstName,
        lastName,
        currentStudent.email,
        joinCode.toUpperCase()
      );

      setBlock(joinedBlock);
      setJoinCode("");
    } catch (err) {
      console.error('Error joining block:', err);
      setError(err instanceof Error ? err.message : 'Failed to join block. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyCode = () => {
    if (!block) return;
    navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveBlock = async () => {
    if (!currentStudent || !block) return;

    // Show confirmation if user is the leader
    const isLeader = block.creator.id === currentStudent.id;
    if (isLeader && block.members.length > 1) {
      const confirmed = window.confirm(
        'You are the block leader. If you leave, the first member who joined will become the new leader. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }

    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const response = await blockAPI.leaveBlock(currentStudent.id);
      setBlock(null);
      setJoinCode("");

      // Show success message from API
      if (response.message) {
        setSuccessMessage(response.message);
      }
    } catch (err) {
      console.error('Error leaving block:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave block. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-white">Loading...</p>
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
        <div className="max-w-4xl mx-auto">
          {/* Title Section */}
          <Card className="mb-6 bg-white">
            <CardContent className="pt-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Student Blocks</h1>
                <p className="text-muted-foreground">
                  Create or join a student block for dorm assignments
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Create/Join Section */}
          {!block && (
            <Card className="mb-6 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Get Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Success Message */}
                {successMessage && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{successMessage}</p>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Create Block */}
                  <Card className="border-2 hover:border-primary transition">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Create New Block
                      </CardTitle>
                      <CardDescription>
                        Start a new block and invite your friends to join
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
                        placeholder="Enter Code (Ex: BLK0011)"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={7}
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
            <Card className="bg-white">
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
      </div>
    </div>
  );
}
