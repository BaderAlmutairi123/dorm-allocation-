"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { 
  Home, 
  MapPin, 
  Users, 
  Phone, 
  Mail,
  ArrowLeft,
  CheckCircle2,
  Clock
} from "lucide-react";

interface Roommate {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  major?: string;
}

interface Assignment {
  assignment_id: number;
  room_id: number;
  block_id?: number;
  status: string;
  assignment_date?: string;
  block_member_count?: number | null; // Block member count if in a block
  room: {
    room_id: number;
    room_number: string;
    floor_number: number;
    room_type: string;
    max_capacity: number;
    current_occupancy: number;
    wants_suite_bathroom: boolean;
    is_accessible: boolean;
    dorm: {
      dorm_id: number;
      dorm_name: string;
      address: string;
      dorm_gender: string;
      dorm_type: string;
    };
  };
  roommates: Roommate[];
}

export default function AssignmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAssignment = async () => {
      try {
        const session = await authClient.getSession();
        if (!session) {
          router.push('/sign-in');
          return;
        }

        const user = await authClient.getUser();
        if (!user) {
          router.push('/sign-in');
          return;
        }

        // Fetch assignment
        const response = await fetch(`/api/assignments/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 404 || data.status === 'Pending') {
            setError('Your room assignment is still pending. Check back later!');
          } else {
            setError(data.error || 'Failed to load assignment');
          }
          setIsLoading(false);
          return;
        }

        if (data.assignment) {
          setAssignment(data.assignment);
        } else {
          setError('No assignment found. Your application may still be under review.');
        }

        setIsLoading(false);
      } catch (err: any) {
        console.error('Error loading assignment:', err);
        setError('Failed to load assignment. Please try again.');
        setIsLoading(false);
      }
    };

    loadAssignment();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-white/20 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-white/20 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link href="/dashboard">
            <Button variant="ghost" className="mb-4 text-white hover:bg-white/10">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>

          <Card>
            <CardHeader>
              <CardTitle>No Assignment Yet</CardTitle>
              <CardDescription>{error || 'Your room assignment is still being processed'}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Your application is being reviewed. You'll be notified once your room assignment is ready.
              </p>
              <div className="flex gap-4">
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
                <Link href="/application">
                  <Button variant="outline">Update Application</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/dashboard">
          <Button variant="ghost" className="mb-4 text-white hover:bg-white/10">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-6 bg-white rounded-lg p-6 shadow-md">
          <h1 className="text-3xl font-bold mb-2 text-gray-900">Your Room Assignment</h1>
          <div className="flex items-center gap-2">
            {assignment.status === 'Confirmed' ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Confirmed</span>
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-600 font-medium">Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Room Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Room Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Building</p>
                <p className="text-xl font-semibold">{assignment.room?.dorm?.dorm_name || 'Unknown Building'}</p>
                {assignment.room?.dorm?.address && (
                  <p className="text-sm text-gray-600 mt-1">{assignment.room.dorm.address}</p>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Room Number</p>
                <p className="text-xl font-semibold">{assignment.room?.room_number || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Floor</p>
                <p className="text-xl font-semibold">Floor {assignment.room?.floor_number || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Room Type</p>
                <p className="text-xl font-semibold">{assignment.room?.room_type || 'N/A'}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Capacity</p>
                <p className="text-xl font-semibold">
                  {/* Use block_member_count if in a block, otherwise use current_occupancy */}
                  {assignment.block_member_count ?? assignment.room?.current_occupancy ?? ((assignment.roommates?.length || 0) + 1)} / {
                    /* Use max_capacity from DB, or infer from room_type if not set */
                    assignment.room?.max_capacity ||
                    (assignment.room?.room_type === 'Single' ? 1 :
                     assignment.room?.room_type === 'Double' ? 2 :
                     assignment.room?.room_type === 'Triple' ? 3 : 4)
                  } students
                </p>
              </div>

              {assignment.assignment_date && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Assignment Date</p>
                  <p className="text-xl font-semibold">
                    {new Date(assignment.assignment_date).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Roommates */}
        {assignment.roommates && assignment.roommates.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Roommates ({assignment.roommates.length})
              </CardTitle>
              <CardDescription>
                Contact information for your assigned roommates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignment.roommates.map((roommate) => (
                  <div key={roommate.student_id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">
                          {roommate.first_name} {roommate.last_name}
                        </p>
                        {roommate.major && (
                          <p className="text-sm text-gray-600 mt-1">{roommate.major}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <a 
                            href={`mailto:${roommate.email}`}
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                          >
                            <Mail className="h-4 w-4" />
                            {roommate.email}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Roommates Message */}
        {assignment.roommates?.length === 0 && (assignment.room?.current_occupancy || 0) < (assignment.room?.max_capacity || 1) && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <p className="text-gray-600 text-center">
                You're the first person assigned to this room. More roommates will be added as assignments are completed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Link href="/dashboard">
            <Button variant="outline" className="bg-white">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}