"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/supabase/auth";
import { useRouter } from "next/navigation";

export default function ApplicationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    major: "",
    year: "",
    gpa: "",
    roomType: "",
    bedtime: "",
    noiseLevel: "",
    cleanlinessLevel: "",
    guestPolicy: "",
    specialNeeds: "",
  });

  // Load user data from auth on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if session exists first
        const session = await authClient.getSession();
        if (!session) {
          // No session, redirect to sign-in
          router.push('/sign-in');
          return;
        }

        // Get user data
        const user = await authClient.getUser();
        if (user) {
          setFormData(prev => ({
            ...prev,
            studentId: user.id,
            email: user.email || "",
            firstName: user.user_metadata?.first_name || "",
            lastName: user.user_metadata?.last_name || "",
          }));
        } else {
          // No user logged in, redirect to sign-in
          router.push('/sign-in');
        }
      } catch (err) {
        console.error('Error loading user:', err);
        // If there's an auth error, redirect to sign-in
        router.push('/sign-in');
      }
    };

    loadUserData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch('/api/application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccess(true);
      // Redirect to success page or dashboard after 2 seconds
      setTimeout(() => {
        router.push('/blocks');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Dorm Application</h1>
        <p className="text-muted-foreground mb-8">
          Complete your dorm application by filling out the information below.
        </p>

        {/* Application Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
            <CardDescription>Track your application progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="font-medium">In Progress</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete your application and submit before the deadline
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deadline</p>
                <p className="font-semibold">March 31, 2025</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Form */}
        <Card>
          <CardHeader>
            <CardTitle>Application Form</CardTitle>
            <CardDescription>Please provide accurate information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID</Label>
                    <Input
                      id="studentId"
                      placeholder="Enter your student ID"
                      value={formData.studentId}
                      readOnly
                      disabled
                      className="bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@university.edu"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(123) 456-7890"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => handleInputChange("gender", value)}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Academic Information</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="major">Major</Label>
                    <Input
                      id="major"
                      placeholder="Computer Science"
                      value={formData.major}
                      onChange={(e) => handleInputChange("major", e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Academic Year</Label>
                    <Select onValueChange={(value) => handleInputChange("year", value)}>
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Freshman">Freshman</SelectItem>
                        <SelectItem value="Sophomore">Sophomore</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gpa">GPA (Optional)</Label>
                  <Input
                    id="gpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="4.00"
                    placeholder="3.50"
                    value={formData.gpa}
                    onChange={(e) => handleInputChange("gpa", e.target.value)}
                  />
                </div>
              </div>

              {/* Housing Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Housing Preferences</h3>

                <div className="space-y-2">
                  <Label htmlFor="roomType">Preferred Room Type</Label>
                  <Select onValueChange={(value) => handleInputChange("roomType", value)}>
                    <SelectTrigger id="roomType">
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single Room</SelectItem>
                      <SelectItem value="Double">Double Room</SelectItem>
                      <SelectItem value="Suite">Suite (3-4 people)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bedtime">Bedtime Preference</Label>
                    <Select onValueChange={(value) => handleInputChange("bedtime", value)}>
                      <SelectTrigger id="bedtime">
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Early Bird">Early Bird</SelectItem>
                        <SelectItem value="Night Owl">Night Owl</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="noiseLevel">Noise Level Tolerance (1-5)</Label>
                    <Select onValueChange={(value) => handleInputChange("noiseLevel", value)}>
                      <SelectTrigger id="noiseLevel">
                        <SelectValue placeholder="1 = Quiet, 5 = Loud" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Quiet</SelectItem>
                        <SelectItem value="2">2 - Quiet</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Loud</SelectItem>
                        <SelectItem value="5">5 - Very Loud</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cleanlinessLevel">Cleanliness Level (1-5)</Label>
                    <Select onValueChange={(value) => handleInputChange("cleanlinessLevel", value)}>
                      <SelectTrigger id="cleanlinessLevel">
                        <SelectValue placeholder="1 = Messy, 5 = Very Clean" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Messy</SelectItem>
                        <SelectItem value="2">2 - Somewhat Messy</SelectItem>
                        <SelectItem value="3">3 - Moderate</SelectItem>
                        <SelectItem value="4">4 - Clean</SelectItem>
                        <SelectItem value="5">5 - Very Clean</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guestPolicy">Guest Policy (0-4 days/week)</Label>
                    <Select onValueChange={(value) => handleInputChange("guestPolicy", value)}>
                      <SelectTrigger id="guestPolicy">
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 - No Guests</SelectItem>
                        <SelectItem value="1">1 - Rarely</SelectItem>
                        <SelectItem value="2">2 - Sometimes</SelectItem>
                        <SelectItem value="3">3 - Often</SelectItem>
                        <SelectItem value="4">4 - Frequently</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialNeeds">Special Accommodations or Medical Needs (Optional)</Label>
                  <Textarea
                    id="specialNeeds"
                    placeholder="Please describe any special accommodations or medical needs..."
                    rows={4}
                    value={formData.specialNeeds}
                    onChange={(e) => handleInputChange("specialNeeds", e.target.value)}
                  />
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-green-600 text-sm">
                    Application submitted successfully! Redirecting to block selection...
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
