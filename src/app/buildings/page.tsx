"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Home, MapPin, Users, Search, Filter } from "lucide-react";

interface Building {
  dorm_id: number;
  dorm_name: string;
  address: string;
  dorm_gender: string;
  dorm_type: string;
  statistics: {
    total_rooms: number;
    total_capacity: number;
    total_occupied: number;
    total_available: number;
    available_rooms: number;
    occupancy_percentage: number;
  };
}

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [filteredBuildings, setFilteredBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    const loadBuildings = async () => {
      try {
        const response = await fetch('/api/buildings');
        const data = await response.json();

        if (data.buildings) {
          setBuildings(data.buildings);
          setFilteredBuildings(data.buildings);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading buildings:', error);
        setIsLoading(false);
      }
    };

    loadBuildings();
  }, []);

  useEffect(() => {
    let filtered = buildings;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(building =>
        building.dorm_name.toLowerCase().includes(query) ||
        building.address.toLowerCase().includes(query)
      );
    }

    // Gender filter
    if (genderFilter !== 'all') {
      filtered = filtered.filter(building => building.dorm_gender === genderFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(building => building.dorm_type === typeFilter);
    }

    setFilteredBuildings(filtered);
  }, [searchQuery, genderFilter, typeFilter, buildings]);

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50';
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dorm Buildings</h1>
        <p className="text-gray-600">Explore all available housing options</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search buildings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Co-ed">Co-ed</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Double">Double</SelectItem>
                <SelectItem value="Suite">Suite</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setGenderFilter("all");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-gray-600">
          Showing {filteredBuildings.length} of {buildings.length} buildings
        </p>
      </div>

      {/* Buildings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBuildings.map((building) => (
          <Card key={building.dorm_id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                {building.dorm_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {building.address}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Building Info */}
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {building.dorm_gender}
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    {building.dorm_type}
                  </span>
                </div>

                {/* Statistics */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Rooms</span>
                    <span className="font-semibold">{building.statistics.total_rooms}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available Rooms</span>
                    <span className="font-semibold text-green-600">
                      {building.statistics.available_rooms}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Capacity</span>
                    <span className="font-semibold">{building.statistics.total_capacity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Available Spots</span>
                    <span className="font-semibold text-green-600">
                      {building.statistics.total_available}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">Occupancy</span>
                      <span className={`text-sm font-semibold ${getOccupancyColor(building.statistics.occupancy_percentage)} px-2 py-1 rounded`}>
                        {building.statistics.occupancy_percentage}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          building.statistics.occupancy_percentage >= 90
                            ? 'bg-red-600'
                            : building.statistics.occupancy_percentage >= 70
                            ? 'bg-yellow-600'
                            : 'bg-green-600'
                        }`}
                        style={{ width: `${building.statistics.occupancy_percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBuildings.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-gray-600">No buildings found matching your filters.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery("");
                setGenderFilter("all");
                setTypeFilter("all");
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

