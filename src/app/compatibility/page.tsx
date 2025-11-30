"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/supabase/auth";
import { supabase } from "@/lib/supabase/client";
import { Users, Search, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Student {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  major?: string;
}

interface CompatibilityResult {
  student1: Student;
  student2: Student;
  compatibility: {
    student1_id: string;
    student2_id: string;
    score: number;
    breakdown: {
      bedtime: number;
      noiseLevel: number;
      cleanliness: number;
      guestPolicy: number;
    };
  };
}

export default function CompatibilityPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [compatibility, setCompatibility] = useState<CompatibilityResult | null>(null);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
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

        // Get current user's student data
        const { data: currentStudent } = await supabase
          .from('students')
          .select('student_id, first_name, last_name, email, major')
          .eq('student_id', user.id)
          .single();

        if (currentStudent) {
          setCurrentUser({
            student_id: currentStudent.student_id,
            first_name: currentStudent.first_name,
            last_name: currentStudent.last_name,
            email: currentStudent.email,
            major: currentStudent.major,
          });
        }

        // Load all students for search (excluding current user)
        const { data: allStudents } = await supabase
          .from('students')
          .select('student_id, first_name, last_name, email, major')
          .neq('student_id', user.id)
          .limit(100);

        if (allStudents) {
          setStudents(allStudents);
        }
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError('Failed to load data');
      }
    };

    loadData();
  }, [router]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredStudents = searchQuery
    ? students.filter(s =>
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.major?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const calculateCompatibility = async (targetStudent: Student) => {
    if (!currentUser) {
      setError('Please sign in to check compatibility');
      return;
    }

    setIsLoading(true);
    setError("");
    setSelectedStudent(targetStudent);

    try {
      const session = await authClient.getSession();
      const response = await fetch(
        `/api/matching/compatibility?student1=${currentUser.student_id}&student2=${targetStudent.student_id}`,
        {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to calculate compatibility');
        setCompatibility(null);
      } else {
        setCompatibility(data);
      }
    } catch (err: any) {
      console.error('Error calculating compatibility:', err);
      setError('Failed to calculate compatibility');
      setCompatibility(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Moderate Match';
    return 'Poor Match';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compatibility Checker</h1>
        <p className="text-gray-600">
          See how compatible you are with potential roommates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Student
            </CardTitle>
            <CardDescription>
              Search for a student to check compatibility
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="search">Search by name, email, or major</Label>
                <Input
                  id="search"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="mt-2"
                />
              </div>

              {searchQuery && filteredStudents.length > 0 && (
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {filteredStudents.map((student) => (
                    <button
                      key={student.student_id}
                      onClick={() => calculateCompatibility(student)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <p className="font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-sm text-gray-600">{student.email}</p>
                      {student.major && (
                        <p className="text-xs text-gray-500">{student.major}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && filteredStudents.length === 0 && (
                <p className="text-gray-600 text-center py-4">No students found</p>
              )}

              {!searchQuery && (
                <p className="text-gray-600 text-center py-4">
                  Start typing to search for students
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Compatibility Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Compatibility Score
            </CardTitle>
            <CardDescription>
              {selectedStudent
                ? `Compatibility with ${selectedStudent.first_name} ${selectedStudent.last_name}`
                : 'Select a student to see compatibility'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Calculating compatibility...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-8">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {!isLoading && !error && compatibility && (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className={`text-6xl font-bold ${getScoreColor(compatibility.compatibility.score)}`}>
                    {compatibility.compatibility.score}
                  </div>
                  <p className={`text-lg font-semibold mt-2 ${getScoreColor(compatibility.compatibility.score)}`}>
                    {getScoreLabel(compatibility.compatibility.score)}
                  </p>
                </div>

                {/* Breakdown */}
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Bedtime Compatibility</span>
                      <span className="text-sm font-semibold">
                        {compatibility.compatibility.breakdown.bedtime}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${compatibility.compatibility.breakdown.bedtime}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Noise Level Match</span>
                      <span className="text-sm font-semibold">
                        {compatibility.compatibility.breakdown.noiseLevel}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${compatibility.compatibility.breakdown.noiseLevel}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Cleanliness Match</span>
                      <span className="text-sm font-semibold">
                        {compatibility.compatibility.breakdown.cleanliness}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{ width: `${compatibility.compatibility.breakdown.cleanliness}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Guest Policy Match</span>
                      <span className="text-sm font-semibold">
                        {compatibility.compatibility.breakdown.guestPolicy}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-600 h-2 rounded-full"
                        style={{ width: `${compatibility.compatibility.breakdown.guestPolicy}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Student Info */}
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Comparing:</p>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-semibold">You:</span> {compatibility.student1.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Student:</span> {compatibility.student2.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !error && !compatibility && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Search and select a student to see your compatibility score
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

