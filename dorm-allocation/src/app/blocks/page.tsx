"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function BlocksPage() {
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);

  // Mock data for buildings and floors
  const buildings = [
    { id: "a", name: "Building A", floors: 4, description: "Modern building with study lounges" },
    { id: "b", name: "Building B", floors: 5, description: "Renovated building near campus center" },
    { id: "c", name: "Building C", floors: 3, description: "Traditional building with large rooms" },
  ];

  const selectedBuildingData = buildings.find(b => b.id === selectedBuilding);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Select Your Block</h1>
        <p className="text-muted-foreground mb-8">
          Choose your preferred building and floor for dorm assignment.
        </p>

        {/* Current Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Selection</CardTitle>
            <CardDescription>Current building and floor preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Selected Building</Label>
                <p className="text-lg font-medium">
                  {selectedBuilding ? buildings.find(b => b.id === selectedBuilding)?.name : "None selected"}
                </p>
              </div>
              <div>
                <Label>Selected Floor</Label>
                <p className="text-lg font-medium">
                  {selectedFloor ? `Floor ${selectedFloor}` : "None selected"}
                </p>
              </div>
              {selectedBuilding && selectedFloor && (
                <Button className="w-full">Confirm Selection</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Building Selection */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Available Buildings</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {buildings.map((building) => (
              <Card
                key={building.id}
                className={`cursor-pointer transition-colors ${
                  selectedBuilding === building.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedBuilding(building.id)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{building.name}</CardTitle>
                  <CardDescription>{building.floors} floors available</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{building.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Floor Selection */}
        {selectedBuildingData && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Select Floor in {selectedBuildingData.name}</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: selectedBuildingData.floors }, (_, i) => i + 1).map((floor) => (
                <Card
                  key={floor}
                  className={`cursor-pointer transition-colors ${
                    selectedFloor === floor.toString() ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => setSelectedFloor(floor.toString())}
                >
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold">Floor {floor}</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {Math.floor(Math.random() * 10) + 5} rooms available
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
