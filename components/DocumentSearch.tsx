"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface DocumentSearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
}

export default function DocumentSearch({ onSearch, onClear }: DocumentSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setSearchQuery("");
    onClear();
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <Input
        type="text"
        placeholder="Search in document..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="pl-10 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
      />
      {searchQuery && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
