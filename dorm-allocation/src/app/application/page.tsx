"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";

export default function ApplicationPage() {
  const [formData, setFormData] = useState({
    studentId: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    major: "",
    year: "",
    roomType: "",
    bedtime: "", 
    cleanliness: "", 
    noiseLevel: "", 
    specialNeeds: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Application submitted:", formData);
    // Handle form submission
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
                      onChange={(e) => handleInputChange("studentId", e.target.value)}
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
                        <SelectItem value="freshman">Freshman</SelectItem>
                        <SelectItem value="sophomore">Sophomore</SelectItem>
                        <SelectItem value="junior">Junior</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
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
                      <SelectItem value="single">Single Room</SelectItem>
                      <SelectItem value="double">Double Room</SelectItem>
                      <SelectItem value="triple">Triple Room</SelectItem>
                      <SelectItem value="suite">Suite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className = "space-y-2"> 
                  <Label>Typical Bedtime</Label> 
                  <RadioGroup 
                     value = {formData.bedtime}
                    onValueChange = {(value) => handleInputChange("bedtime", value)}> 
                    <div className = "flex items-center space-x-2">
                      <RadioGroupItem value = "before 10pm" id="before-10pm"/>
                      <Label htmlFor="before-10pm" className="font-normal cursor-pointer"> Before 10pm</Label> </div>
                    <div className= "flex items-center space-x-2"> 
                      <RadioGroupItem value="10pm-2am" id="10pm-12am" />
                      <Label htmlFor= "10pm-12am" className="font-normal cursor-pointer">10pm-12am</Label></div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="12am-2am" id="12am-2am"/>
                      <Label htmlFor="12am-2am" className="font-normal cursor-pointer">12am-2pm</Label></div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="after-2am" id="after-2am"/>
                      <Label htmlFor="after-2am" className="font-normal cursor-pointer">After 2am</Label></div>
                    </RadioGroup> 
                    </div> 
                
                    <div className = "space-y-2">
                      <Label htmlFor="cleanliness">Cleanliness Level</Label>
                      <Select onValueChange= {(value) => handleInputChange("cleanliness",value)}>
                          <SelectTrigger id="cleanliness">
                             <SelectValue placeholder="How tidy are you?" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="very-neat">Vert neat and organized</SelectItem>
                            <SelectItem value="neat">Neat and generally clean and tidy</SelectItem>
                            <SelectItem value="relaxed">Relaxed and not worried about mess</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    <div className="space-y-2">
                      <Label htmlFor="noiseLevel">Study Environment Preference</Label>
                      <Select onValueChange={(value) => handleInputChange("noiseLevel", value)}>
                          <SelectTrigger id="noiseLevel">
                            <SelectValue placeholder="Select your noise preference"/>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="silent">Complete silence required</SelectItem>
                            <SelectItem value="quiet">Quiet environment preferred</SelectItem>
                            <SelectItem value="background">Background noise is okay</SelectItem>
                            <SelectItem value="any">Any noise level is acceptable</SelectItem>
                          </SelectContent>
                      </Select>
                    </div>

                <div className="space-y-2">
                  <Label htmlFor="specialNeeds">Special Accommodations or Medical Needs</Label>
                  <Textarea
                    id="specialNeeds"
                    placeholder="Please describe any special accommodations or medical needs..."
                    rows={4}
                    value={formData.specialNeeds}
                    onChange={(e) => handleInputChange("specialNeeds", e.target.value)}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button type="submit" className="flex-1">Submit Application</Button>
                <Button type="button" variant="outline">Save Draft</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
