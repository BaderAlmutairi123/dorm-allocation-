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

// Hofstra University Majors
const HOFSTRA_MAJORS = [
  "Accounting",
  "Africana Studies",
  "American Studies",
  "Anthropology",
  "Applied Physics",
  "Art History",
  "Asian Studies",
  "Athletic Training",
  "Audio/Radio Production and Studies",
  "Biochemistry",
  "Bioengineering",
  "Biology",
  "Business Analytics",
  "Chemistry",
  "Chinese",
  "Chinese Studies",
  "Civil Engineering",
  "Classics",
  "Community Health",
  "Comparative Literature and Languages",
  "Computer Engineering",
  "Computer Science",
  "Computer Science and Mathematics",
  "Computer Science and Cybersecurity",
  "Criminology",
  "Dance",
  "Drama",
  "Early Childhood/Childhood Education",
  "Economics",
  "Economics (Business)",
  "Electrical Engineering",
  "Elementary Education",
  "Engineering Science",
  "English",
  "English Education",
  "Entrepreneurship",
  "Environmental Resources",
  "Exercise Physiology",
  "Film Studies and Production",
  "Filmmaking",
  "Fine Arts",
  "Foreign Language Education",
  "Forensic Science",
  "French",
  "Geographic Information Systems",
  "Geography",
  "Geology",
  "German",
  "Global Studies",
  "Health Education",
  "Health Science",
  "Hebrew",
  "History",
  "Individually Designed Major (Humanities/Natural Sciences/Social Sciences)",
  "Industrial Engineering",
  "Information Systems",
  "International Business",
  "Italian",
  "Japanese",
  "Japanese Studies",
  "Jewish Studies",
  "Journalism",
  "Labor Studies",
  "Latin",
  "Latin American and Caribbean Studies",
  "Liberal Arts",
  "Linguistics",
  "Management",
  "Marketing",
  "Mass Media Studies",
  "Mathematical Business Economics",
  "Mathematical Economics",
  "Mathematical Finance",
  "Mathematics",
  "Mathematics Education",
  "Mechanical Engineering",
  "Music",
  "Music Business",
  "Music Education",
  "Neuroscience",
  "Nursing",
  "Philosophy",
  "Physical Education",
  "Physics",
  "Political Science",
  "Pre-Health Studies",
  "Pre-Medical Studies",
  "Psychology",
  "Public Policy and Public Service",
  "Public Relations",
  "Religion",
  "Religion and Contemporary Issues",
  "Rhetoric and Public Advocacy",
  "Russian",
  "Science Education",
  "STEM (Science, Technology, Engineering & Mathematics)",
  "Social Studies Education",
  "Sociology",
  "Spanish",
  "Speech-Language-Hearing Sciences",
  "Sports Management",
  "Supply Chain Management",
  "Sustainability Studies",
  "Television Production and Studies",
  "Theater Arts",
  "Urban Ecology",
  "Video/Television",
  "Video/Television and Business",
  "Video/Television and Film",
  "Women's Studies",
  "Writing for the Screen",
  "Writing Studies",
];

export default function ApplicationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [majorSearch, setMajorSearch] = useState("");
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);
  const [formData, setFormData] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    major: "",
    year: "",
    roomType: "",
    bedtime: "",
    noiseLevel: "",
    cleanlinessLevel: "",
    guestPolicy: "",
    specialNeeds: "",
  });

  // Filter majors based on search
  const filteredMajors = HOFSTRA_MAJORS.filter(major =>
    major.toLowerCase().includes(majorSearch.toLowerCase())
  );

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

  // Close major dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#major') && !target.closest('.major-dropdown')) {
        setShowMajorDropdown(false);
      }
    };

    if (showMajorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMajorDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Get the auth token from Supabase session
      const session = await authClient.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
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

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const phoneNumber = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limitedPhoneNumber = phoneNumber.substring(0, 10);

    // Format as (XXX) XXX-XXXX
    if (limitedPhoneNumber.length <= 3) {
      return limitedPhoneNumber;
    } else if (limitedPhoneNumber.length <= 6) {
      return `(${limitedPhoneNumber.slice(0, 3)}) ${limitedPhoneNumber.slice(3)}`;
    } else {
      return `(${limitedPhoneNumber.slice(0, 3)}) ${limitedPhoneNumber.slice(3, 6)}-${limitedPhoneNumber.slice(6)}`;
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
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
                      onChange={handlePhoneChange}
                      maxLength={14}
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
                  <div className="space-y-2 relative">
                    <Label htmlFor="major">Major</Label>
                    <Input
                      id="major"
                      placeholder="Type to search majors..."
                      value={showMajorDropdown ? majorSearch : formData.major}
                      onChange={(e) => {
                        setMajorSearch(e.target.value);
                        setShowMajorDropdown(true);
                      }}
                      onFocus={() => {
                        setMajorSearch("");
                        setShowMajorDropdown(true);
                      }}
                      autoComplete="off"
                    />
                    {showMajorDropdown && filteredMajors.length > 0 && (
                      <div className="major-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {filteredMajors.map((major) => (
                          <div
                            key={major}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            onClick={() => {
                              setFormData({ ...formData, major });
                              setMajorSearch("");
                              setShowMajorDropdown(false);
                            }}
                          >
                            {major}
                          </div>
                        ))}
                      </div>
                    )}
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
