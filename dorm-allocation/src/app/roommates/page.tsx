"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function RoommatesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for potential roommates
  const potentialRoommates = [
    { id: 1, name: "John Doe", major: "Computer Science", year: "Sophomore", interests: "Gaming, Music" },
    { id: 2, name: "Jane Smith", major: "Biology", year: "Junior", interests: "Reading, Hiking" },
    { id: 3, name: "Mike Johnson", major: "Engineering", year: "Freshman", interests: "Sports, Movies" },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Find Roommates</h1>
        <p className="text-muted-foreground mb-8">
          Browse potential roommates and send requests to those who match your preferences.
        </p>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Search Roommates</CardTitle>
            <CardDescription>Find students based on major, interests, or preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by name, major, or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button>Search</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roommate Requests Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Roommate Requests</CardTitle>
            <CardDescription>View pending and accepted requests</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No pending requests</p>
          </CardContent>
        </Card>

        {/* Potential Roommates List */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Potential Roommates</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {potentialRoommates.map((roommate) => (
              <Card key={roommate.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{roommate.name}</CardTitle>
                  <CardDescription>{roommate.major} " {roommate.year}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Interests</p>
                      <p className="text-sm text-muted-foreground">{roommate.interests}</p>
                    </div>
                    <Button className="w-full mt-4">Send Request</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
