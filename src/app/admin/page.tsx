"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/supabase/auth";
import { 
  Users, 
  Home, 
  PlayCircle, 
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react";

interface MatchingStatus {
  pendingStudents: number;
  assignedStudents: number;
  availableRooms: number;
  totalRooms: number;
  blocks: number;
  canRunMatching: boolean;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<MatchingStatus | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [matchingResult, setMatchingResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession();
        if (!session) {
          router.push('/sign-in');
          return;
        }

        // TODO: Add admin role check
        // For now, allow any authenticated user (remove in production)
        loadStatus();
      } catch (err) {
        router.push('/sign-in');
      }
    };

    checkAuth();
  }, [router]);

  const loadStatus = async () => {
    try {
      const response = await fetch('/api/matching/status');
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setStatus(data);
      }
      setIsLoading(false);
    } catch (err: any) {
      console.error('Error loading status:', err);
      setError('Failed to load matching status');
      setIsLoading(false);
    }
  };

  const runMatching = async () => {
    if (!confirm('Are you sure you want to run the matching algorithm? This will assign rooms to pending students.')) {
      return;
    }

    setIsRunning(true);
    setError("");
    setMatchingResult(null);

    try {
      const response = await fetch('/api/matching/run', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setMatchingResult({
          success: true,
          message: data.message,
          matches: data.matches?.length || 0,
          unmatched: data.unmatched?.length || 0,
        });
        // Reload status after matching
        setTimeout(() => {
          loadStatus();
        }, 1000);
      } else {
        setMatchingResult({
          success: false,
          message: data.message || data.error,
          matches: data.matches?.length || 0,
          unmatched: data.unmatched?.length || 0,
          errors: data.errors,
        });
      }
    } catch (err: any) {
      console.error('Error running matching:', err);
      setError('Failed to run matching algorithm');
      setMatchingResult({
        success: false,
        message: 'Failed to run matching algorithm',
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage dorm assignments and matching</p>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pending Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{status.pendingStudents}</p>
              <p className="text-sm text-gray-600 mt-1">Awaiting assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Assigned Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{status.assignedStudents}</p>
              <p className="text-sm text-gray-600 mt-1">Successfully matched</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-blue-600" />
                Available Rooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{status.availableRooms}</p>
              <p className="text-sm text-gray-600 mt-1">
                of {status.totalRooms} total rooms
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                Student Blocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{status.blocks}</p>
              <p className="text-sm text-gray-600 mt-1">Active blocks</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Matching Control */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Matching Algorithm</CardTitle>
          <CardDescription>
            Run the matching algorithm to assign rooms to pending students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">Pending Students:</span> {status.pendingStudents}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Available Rooms:</span> {status.availableRooms}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Can Run Matching:</span>{' '}
                    {status.canRunMatching ? (
                      <span className="text-green-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-red-600 font-semibold">No</span>
                    )}
                  </p>
                </div>
              </div>

              <Button
                onClick={runMatching}
                disabled={isRunning || !status.canRunMatching}
                className="w-full md:w-auto"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Running Matching...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Matching Algorithm
                  </>
                )}
              </Button>

              {!status.canRunMatching && (
                <p className="text-sm text-yellow-600">
                  Cannot run matching: Need pending students and available rooms
                </p>
              )}
            </div>
          )}

          {matchingResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              matchingResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-start gap-2">
                {matchingResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                )}
                <div>
                  <p className={`font-semibold ${
                    matchingResult.success ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {matchingResult.message}
                  </p>
                  <div className="mt-2 text-sm space-y-1">
                    <p className={matchingResult.success ? 'text-green-700' : 'text-yellow-700'}>
                      Matched: {matchingResult.matches} students
                    </p>
                    {matchingResult.unmatched > 0 && (
                      <p className={matchingResult.success ? 'text-green-700' : 'text-yellow-700'}>
                        Unmatched: {matchingResult.unmatched} students
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              <Users className="mr-2 h-4 w-4" />
              View All Students
            </Button>
            <Button variant="outline" className="justify-start">
              <Home className="mr-2 h-4 w-4" />
              Manage Rooms
            </Button>
            <Button variant="outline" className="justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

