"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { 
  CheckCircle2, 
  Clock, 
  Home, 
  FileText, 
  Users, 
  AlertCircle,
  ArrowRight,
  Calendar
} from "lucide-react";

interface ApplicationStatus {
  profileComplete: boolean;
  preferencesComplete: boolean;
  applicationStatus: 'Not Started' | 'Pending' | 'Assigned';
  assignment?: {
    room_number: string;
    dorm_name: string;
    floor_number: number;
    room_type: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<ApplicationStatus>({
    profileComplete: false,
    preferencesComplete: false,
    applicationStatus: 'Not Started',
  });
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const session = await authClient.getSession();
        if (!session) {
          router.push('/sign-in');
          return;
        }

        const user = await authClient.getUser();
        if (user?.user_metadata) {
          const firstName = user.user_metadata.first_name || "";
          const lastName = user.user_metadata.last_name || "";
          setUserName(`${firstName} ${lastName}`.trim() || user.email || "Student");
        }

        // Check student profile
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('student_id', user?.id)
          .single();

        const profileComplete = !!student;

        // Check preferences
        const { data: preferences } = await supabase
          .from('student_preferences')
          .select('*')
          .eq('student_id', user?.id)
          .single();

        const preferencesComplete = !!preferences;

        // Check assignment
        const { data: assignment } = await supabase
          .from('room_assignments')
          .select('*, rooms(*, dorms(*))')
          .eq('student_id', user?.id)
          .single();

        let applicationStatus: 'Not Started' | 'Pending' | 'Assigned' = 'Not Started';
        let assignmentData = null;

        if (assignment) {
          if (assignment.status === 'Confirmed' && assignment.room_id) {
            applicationStatus = 'Assigned';
            assignmentData = {
              room_number: assignment.rooms?.room_number,
              dorm_name: assignment.rooms?.dorms?.dorm_name,
              floor_number: assignment.rooms?.floor_number,
              room_type: assignment.rooms?.room_type,
            };
          } else if (assignment.status === 'Pending') {
            applicationStatus = 'Pending';
          }
        }

        setStatus({
          profileComplete,
          preferencesComplete,
          applicationStatus,
          assignment: assignmentData || undefined,
        });

        setIsLoading(false);
      } catch (error) {
        console.error('Error loading dashboard:', error);
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [router]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'Pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Assigned':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'Pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
        <p className="text-gray-600">Here's your housing application status</p>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className={`border-2 ${getStatusColor(status.applicationStatus)}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(status.applicationStatus)}
              Application Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{status.applicationStatus}</p>
            {status.applicationStatus === 'Assigned' && status.assignment && (
              <p className="text-sm mt-2">
                {status.assignment.dorm_name} - Room {status.assignment.room_number}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.profileComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {status.profileComplete ? 'Complete' : 'Incomplete'}
            </p>
            {!status.profileComplete && (
              <Link href="/application">
                <Button variant="outline" size="sm" className="mt-2">
                  Complete Profile
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.preferencesComplete ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-gray-400" />
              )}
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {status.preferencesComplete ? 'Complete' : 'Incomplete'}
            </p>
            {!status.preferencesComplete && (
              <Link href="/application">
                <Button variant="outline" size="sm" className="mt-2">
                  Add Preferences
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and next steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {status.applicationStatus === 'Assigned' ? (
              <Link href="/assignment">
                <Button className="w-full justify-start" variant="outline">
                  <Home className="mr-2 h-4 w-4" />
                  View Room Assignment
                </Button>
              </Link>
            ) : (
              <Link href="/application">
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  {status.applicationStatus === 'Not Started' ? 'Start Application' : 'Update Application'}
                </Button>
              </Link>
            )}

            <Link href="/blocks">
              <Button className="w-full justify-start" variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Find Roommates
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Preview */}
      {status.applicationStatus === 'Assigned' && status.assignment && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Your Room Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Building</p>
                <p className="text-lg font-semibold">{status.assignment.dorm_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room Number</p>
                <p className="text-lg font-semibold">{status.assignment.room_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Floor</p>
                <p className="text-lg font-semibold">{status.assignment.floor_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Room Type</p>
                <p className="text-lg font-semibold">{status.assignment.room_type}</p>
              </div>
            </div>
            <Link href="/assignment">
              <Button>
                View Full Details
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Application Progress */}
      {status.applicationStatus !== 'Assigned' && (
        <Card>
          <CardHeader>
            <CardTitle>Application Progress</CardTitle>
            <CardDescription>Complete these steps to finish your application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {status.profileComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                )}
                <div className="flex-1">
                  <p className="font-medium">Complete Your Profile</p>
                  <p className="text-sm text-gray-600">Personal information and contact details</p>
                </div>
                {!status.profileComplete && (
                  <Link href="/application">
                    <Button size="sm">Complete</Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4">
                {status.preferencesComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                )}
                <div className="flex-1">
                  <p className="font-medium">Submit Your Preferences</p>
                  <p className="text-sm text-gray-600">Help us match you with compatible roommates</p>
                </div>
                {!status.preferencesComplete && (
                  <Link href="/application">
                    <Button size="sm">Complete</Button>
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-4">
                {status.applicationStatus === 'Pending' ? (
                  <Clock className="h-6 w-6 text-yellow-600" />
                ) : (
                  <div className="h-6 w-6 rounded-full border-2 border-gray-300" />
                )}
                <div className="flex-1">
                  <p className="font-medium">Wait for Assignment</p>
                  <p className="text-sm text-gray-600">
                    {status.applicationStatus === 'Pending' 
                      ? 'Your application is under review' 
                      : 'We\'ll match you once your application is complete'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

