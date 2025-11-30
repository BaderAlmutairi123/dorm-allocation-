"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
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
  const { user, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [majorSearch, setMajorSearch] = useState("");
  const [showMajorDropdown, setShowMajorDropdown] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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
  });

  // Filter majors based on search
  const filteredMajors = HOFSTRA_MAJORS.filter(major =>
    major.toLowerCase().includes(majorSearch.toLowerCase())
  );

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str: string) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Load user data from auth context
  useEffect(() => {
    const loadUserData = async () => {
      if (loading) return; // Wait for auth to load

      if (!user) {
        // No user, redirect to sign-in
        router.push('/sign-in');
        return;
      }

      try {
        // First, try to get data from user metadata
        let firstName = user.user_metadata?.first_name || "";
        let lastName = user.user_metadata?.last_name || "";

        // Fetch full student data from students table
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('first_name, last_name, phone, gender, year_level, major')
          .eq('student_id', user.id)
          .single();

        if (!studentError && studentData) {
          firstName = studentData.first_name || firstName;
          lastName = studentData.last_name || lastName;

          // Capitalize first letter of names
          firstName = capitalizeFirstLetter(firstName);
          lastName = capitalizeFirstLetter(lastName);

          // Check if student has already submitted preferences
          const { data: preferencesData, error: preferencesError } = await supabase
            .from('student_preferences')
            .select('*')
            .eq('student_id', user.id)
            .single();

          if (!preferencesError && preferencesData) {
            // Student has already submitted - load their data and set as submitted
            setIsSubmitted(true);

            // Convert year_level number back to text for display
            const yearLevelText: { [key: number]: string } = {
              1: 'Freshman',
              2: 'Sophomore',
              3: 'Junior',
              4: 'Senior',
            };

            setFormData({
              studentId: user.id,
              email: user.email || "",
              firstName: firstName,
              lastName: lastName,
              phone: studentData.phone ? `(${studentData.phone.slice(0, 3)}) ${studentData.phone.slice(3, 6)}-${studentData.phone.slice(6)}` : "",
              gender: studentData.gender || "",
              major: studentData.major || "",
              year: yearLevelText[studentData.year_level] || "",
              roomType: preferencesData.preferred_room_type || "",
              bedtime: preferencesData.bedtime || "",
              noiseLevel: preferencesData.noise_level?.toString() || "",
              cleanlinessLevel: preferencesData.cleanliness_level?.toString() || "",
              guestPolicy: preferencesData.guest_policy_preference?.toString() || "",
            });
          } else {
            // Student hasn't submitted yet - just set basic info
            const capitalizedFirstName = capitalizeFirstLetter(firstName);
            const capitalizedLastName = capitalizeFirstLetter(lastName);

            setFormData(prev => ({
              ...prev,
              studentId: user.id,
              email: user.email || "",
              firstName: capitalizedFirstName,
              lastName: capitalizedLastName,
            }));
          }
        } else {
          // No student data found, just set basic info from auth
          const capitalizedFirstName = capitalizeFirstLetter(firstName);
          const capitalizedLastName = capitalizeFirstLetter(lastName);

          setFormData(prev => ({
            ...prev,
            studentId: user.id,
            email: user.email || "",
            firstName: capitalizedFirstName,
            lastName: capitalizedLastName,
          }));
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };

    loadUserData();
  }, [user, loading, router]);

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
      // Submit the application directly
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
      setIsSubmitted(true);
      // Stay on the same page - form will be grayed out automatically

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
    <div className="min-h-screen" style={{ backgroundColor: '#2D3BA6' }}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Dorm Application Header & Status */}
          <Card className="mb-8 bg-white">
            <CardHeader>
              <CardTitle className="text-3xl">Dorm Application</CardTitle>
              <CardDescription className="text-base">
                Complete your dorm application by filling out the information below.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Application Status</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    {isSubmitted ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="font-medium text-green-700">Completed</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Your application has been submitted successfully
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="font-medium text-yellow-700">In Progress</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Complete your application and submit your preferences
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Form */}
          <Card className="bg-white">
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
                        readOnly
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
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
                        readOnly
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        readOnly
                        disabled
                        className="bg-gray-100 cursor-not-allowed"
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
                        disabled={isSubmitted}
                        className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        onValueChange={(value) => handleInputChange("gender", value)}
                        value={formData.gender}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger id="gender" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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
                          if (!isSubmitted) {
                            setMajorSearch("");
                            setShowMajorDropdown(true);
                          }
                        }}
                        autoComplete="off"
                        disabled={isSubmitted}
                        className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}
                      />
                      {showMajorDropdown && filteredMajors.length > 0 && !isSubmitted && (
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
                      <Select
                        onValueChange={(value) => handleInputChange("year", value)}
                        value={formData.year}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger id="year" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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
                    <Select
                      onValueChange={(value) => handleInputChange("roomType", value)}
                      value={formData.roomType}
                      disabled={isSubmitted}
                    >
                      <SelectTrigger id="roomType" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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
                      <Select
                        onValueChange={(value) => handleInputChange("bedtime", value)}
                        value={formData.bedtime}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger id="bedtime" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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
                      <Select
                        onValueChange={(value) => handleInputChange("noiseLevel", value)}
                        value={formData.noiseLevel}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger id="noiseLevel" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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
                      <Select
                        onValueChange={(value) => handleInputChange("cleanlinessLevel", value)}
                        value={formData.cleanlinessLevel}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger id="cleanlinessLevel" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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
                      <Select
                        onValueChange={(value) => handleInputChange("guestPolicy", value)}
                        value={formData.guestPolicy}
                        disabled={isSubmitted}
                      >
                        <SelectTrigger id="guestPolicy" className={isSubmitted ? "bg-gray-100 cursor-not-allowed" : ""}>
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

                </div>

                {/* Error and Success Messages */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {isSubmitted && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-600 text-sm font-medium">
                      ✓ Your application has been submitted. Your preferences are shown above.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-800 hover:bg-blue-900"
                    disabled={isLoading || isSubmitted}
                  >
                    {isSubmitted ? 'Application Already Submitted' : (isLoading ? 'Submitting...' : 'Submit Application')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}