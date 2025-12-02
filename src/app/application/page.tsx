"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/supabase/auth";
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
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
    assignmentPreference: "", // "random" = match with others, "private" = empty room + block to invite friends, "join" = join existing block
    bedtime: "",
    noiseLevel: "",
    cleanlinessLevel: "",
    guestPolicy: "",
  });
  const [joinBlockCode, setJoinBlockCode] = useState("");
  const [joinBlockError, setJoinBlockError] = useState("");
  const [joinBlockSuccess, setJoinBlockSuccess] = useState(false);

  // Check if single room is selected (no roommate preferences needed)
  const isSingleRoom = formData.roomType === "Single";
  // Check if room type requires roommate options
  const needsRoommateOptions = formData.roomType === "Double" || formData.roomType === "Suite";

  // Filter majors based on search
  const filteredMajors = HOFSTRA_MAJORS.filter(major =>
    major.toLowerCase().includes(majorSearch.toLowerCase())
  );

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str: string) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

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

              // Determine assignment preference based on room type and preferences
              let inferredAssignmentPref = "random";
              if (preferencesData.preferred_room_type === "Single") {
                inferredAssignmentPref = "single";
              } else if (preferencesData.bedtime || preferencesData.noise_level || preferencesData.cleanliness_level || preferencesData.guest_policy_preference) {
                inferredAssignmentPref = "random";
              }

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
                assignmentPreference: inferredAssignmentPref,
                bedtime: preferencesData.bedtime || "",
                noiseLevel: preferencesData.noise_level?.toString() || "",
                cleanlinessLevel: preferencesData.cleanliness_level?.toString() || "",
                guestPolicy: preferencesData.guest_policy_preference?.toString() || "",
              });
            } else {
              // Student hasn't submitted yet - just set basic info
              // Capitalize first letter of names
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
            // Capitalize first letter of names
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

  const handleRestartApplication = async () => {
    if (!confirm('Are you sure you want to restart your application? This will delete your current preferences and room assignment.')) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const session = await authClient.getSession();
      const token = session?.access_token;

      const response = await fetch('/api/application', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restart application');
      }

      // Reset form state - only clear preferences, keep basic student info
      setIsSubmitted(false);
      setSuccess(false);
      setSuccessMessage("");
      setFormData(prev => ({
        ...prev,
        // Keep phone, gender, major, year - user can update these if they want
        roomType: "",
        assignmentPreference: "",
        bedtime: "",
        noiseLevel: "",
        cleanlinessLevel: "",
        guestPolicy: "",
      }));

    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setJoinBlockError("");

    try {
      // Get the auth token from Supabase session
      const session = await authClient.getSession();
      const token = session?.access_token;

      // If joining a block, first save basic student info, then join the block
      if (formData.assignmentPreference === 'join') {
        if (!joinBlockCode.trim() || joinBlockCode.length !== 6) {
          setJoinBlockError("Please enter a valid 6-character block code");
          setIsLoading(false);
          return;
        }

        // First, save the student's basic info (so they have a record in the students table)
        const studentResponse = await fetch('/api/application', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({
            ...formData,
            // Override assignment preference to prevent creating a separate block
            assignmentPreference: 'join_block_pending',
          }),
        });

        if (!studentResponse.ok) {
          const studentData = await studentResponse.json();
          setError(studentData.error || 'Failed to save student information');
          setIsLoading(false);
          return;
        }

        // Now try to join the block
        const joinResponse = await fetch('/api/blocks/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify({ code: joinBlockCode, roomType: formData.roomType }),
        });

        const joinData = await joinResponse.json();

        if (!joinResponse.ok) {
          setJoinBlockError(joinData.error || 'Failed to join block');
          setIsLoading(false);
          return;
        }

        setJoinBlockSuccess(true);
        setSuccess(true);
        setIsSubmitted(true);
        setSuccessMessage("Successfully joined block! You've been assigned to your friend's room.");
        
        // Redirect to assignment page after a short delay
        setTimeout(() => {
          router.push('/assignment');
        }, 1500);
        return;
      }

      // Regular application submission
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
      setIsSubmitted(true);
      // Store success message if provided
      if (data.message) {
        setSuccessMessage(data.message);
        setError(""); // Clear any errors
      }
      
      // Redirect to assignment page after a short delay
      setTimeout(() => {
        router.push('/assignment');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
                Complete your dorm application by providing your personal information and roommate preferences below.
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
                          Complete and submit your application below
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
                  <h3 className="text-lg font-semibold">Personal Information & Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Provide your contact information and roommate preferences to help us find you the best match.
                  </p>

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
                  <h3 className="text-lg font-semibold">Room Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose your preferred room type and how you&apos;d like to be matched.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="roomType">Preferred Room Type</Label>
                    <Select
                      onValueChange={(value) => {
                        if (value === "Single") {
                          // Auto-set for single rooms - update all at once
                          setFormData(prev => ({
                            ...prev,
                            roomType: value,
                            assignmentPreference: "single",
                            bedtime: "",
                            noiseLevel: "",
                            cleanlinessLevel: "",
                            guestPolicy: "",
                          }));
                        } else {
                          // For Double/Suite - clear assignment preference so user can choose
                          setFormData(prev => ({
                            ...prev,
                            roomType: value,
                            assignmentPreference: "",
                          }));
                        }
                      }}
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

                  {/* Assignment Preference - Only show for Double/Suite */}
                  {needsRoommateOptions && (
                    <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Label className="text-base font-semibold">How would you like to be assigned?</Label>
                      <div className="space-y-3">
                        <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${formData.assignmentPreference === 'join' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white hover:border-gray-300'} ${isSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            type="radio"
                            name="assignmentPreference"
                            value="join"
                            checked={formData.assignmentPreference === 'join'}
                            onChange={(e) => handleInputChange("assignmentPreference", e.target.value)}
                            disabled={isSubmitted}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium">Join a friend&apos;s block</p>
                            <p className="text-sm text-muted-foreground">
                              Enter your friend&apos;s block code to join their room
                            </p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${formData.assignmentPreference === 'random' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white hover:border-gray-300'} ${isSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            type="radio"
                            name="assignmentPreference"
                            value="random"
                            checked={formData.assignmentPreference === 'random'}
                            onChange={(e) => handleInputChange("assignmentPreference", e.target.value)}
                            disabled={isSubmitted}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium">Match me with compatible roommates</p>
                            <p className="text-sm text-muted-foreground">
                              We&apos;ll find you roommates based on your preferences below
                            </p>
                          </div>
                        </label>
                        <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${formData.assignmentPreference === 'private' ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white hover:border-gray-300'} ${isSubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            type="radio"
                            name="assignmentPreference"
                            value="private"
                            checked={formData.assignmentPreference === 'private'}
                            onChange={(e) => handleInputChange("assignmentPreference", e.target.value)}
                            disabled={isSubmitted}
                            className="mt-1"
                          />
                          <div>
                            <p className="font-medium">Give me an empty room to invite friends</p>
                            <p className="text-sm text-muted-foreground">
                              You&apos;ll get a private room and block code to share with friends
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Join Block Code Input - Show when join option selected */}
                  {needsRoommateOptions && formData.assignmentPreference === 'join' && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
                      <p className="text-green-700 font-medium">🔗 Join a Friend&apos;s Block</p>
                      <p className="text-sm text-green-600">
                        Enter the 6-character block code your friend shared with you.
                      </p>
                      <Input
                        type="text"
                        placeholder="Enter code (e.g., ABC123)"
                        value={joinBlockCode}
                        onChange={(e) => {
                          setJoinBlockCode(e.target.value.toUpperCase());
                          setJoinBlockError("");
                          setJoinBlockSuccess(false);
                        }}
                        maxLength={6}
                        className="uppercase bg-white"
                        disabled={isSubmitted || joinBlockSuccess}
                      />
                      {joinBlockError && (
                        <p className="text-red-600 text-sm">{joinBlockError}</p>
                      )}
                      {joinBlockSuccess && (
                        <p className="text-green-700 text-sm font-medium">✓ Successfully joined block! You&apos;ll be assigned to your friend&apos;s room.</p>
                      )}
                    </div>
                  )}

                  {/* Single Room Message */}
                  {isSingleRoom && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-green-700 font-medium">✓ Single Room Selected</p>
                      <p className="text-sm text-green-600">
                        You&apos;ll be assigned a private single room. No roommate matching needed!
                      </p>
                    </div>
                  )}
                </div>

                {/* Roommate Matching Preferences - Only show for Double/Suite with random matching */}
                {needsRoommateOptions && formData.assignmentPreference === 'random' && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Roommate Matching Preferences</h3>
                    <p className="text-sm text-muted-foreground">
                      Help us find you compatible roommates by sharing your living preferences.
                    </p>

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
                )}

                {/* Private Room Info - Show when private option selected */}
                {needsRoommateOptions && formData.assignmentPreference === 'private' && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-purple-700 font-medium">📨 Private Room + Block</p>
                    <p className="text-sm text-purple-600">
                      After submission, you&apos;ll receive a block code that you can share with friends. 
                      They can use this code to join your room group in the Blocks &amp; Roommates page.
                    </p>
                  </div>
                )}

                {/* Error and Success Messages */}
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                {success && !error && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-600 text-sm font-medium">
                      ✓ {successMessage || "Your application has been submitted successfully! We'll match you with compatible roommates soon."}
                    </p>
                  </div>
                )}

                {isSubmitted && !success && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-blue-600 text-sm font-medium">
                      ✓ Your application has been submitted. You can view your information above.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="space-y-3">
                  <Button
                    type="submit"
                    className="w-full bg-blue-800 hover:bg-blue-900"
                    disabled={isLoading || isSubmitted}
                  >
                    {isSubmitted ? 'Application Already Submitted' : (isLoading ? 'Submitting...' : 'Submit Application')}
                  </Button>
                  
                  {isSubmitted && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={handleRestartApplication}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Restarting...' : 'Restart Application'}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}