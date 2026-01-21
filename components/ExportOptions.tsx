"use client";

import { Download, FileJson, FileText, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

interface ExportOptionsProps {
  parsedText: string;
  fileType: string;
  fileName?: string;
}

export default function ExportOptions({ parsedText, fileType, fileName = "document" }: ExportOptionsProps) {
  const { toast } = useToast();

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "✅ Export Successful",
      description: `Downloaded as ${filename}`,
    });
  };

  const exportAsJSON = () => {
    let jsonData;
    
    if (fileType.startsWith("image/")) {
      // Already JSON for images
      jsonData = parsedText;
    } else {
      // Convert text to JSON structure
      jsonData = JSON.stringify({
        content: parsedText,
        fileType,
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }

    downloadFile(jsonData, `${fileName}.json`, "application/json");
  };

  const exportAsText = () => {
    let textContent = parsedText;

    if (fileType.startsWith("image/")) {
      try {
        const parsed = JSON.parse(parsedText);
        const fields = parsed.fields || [];
        textContent = fields.map((f: any) => `${f.key}: ${f.value}`).join("\n");
      } catch (e) {
        textContent = parsedText;
      }
    } else if (fileType.includes("wordprocessingml")) {
      // Strip HTML tags for DOCX
      const div = document.createElement("div");
      div.innerHTML = parsedText;
      textContent = div.textContent || div.innerText || "";
    }

    downloadFile(textContent, `${fileName}.txt`, "text/plain");
  };

  const exportAsCSV = () => {
    let csvContent = "";

    if (fileType.startsWith("image/")) {
      try {
        const parsed = JSON.parse(parsedText);
        const fields = parsed.fields || [];
        csvContent = "Field,Value,Confidence\n";
        csvContent += fields.map((f: any) => 
          `"${f.key}","${f.value}","${f.confidence || 'N/A'}"`
        ).join("\n");
      } catch (e) {
        csvContent = "Content\n" + parsedText;
      }
    } else {
      // For PDF/DOCX, create simple CSV
      csvContent = "Content\n" + `"${parsedText.replace(/"/g, '""')}"`;
    }

    downloadFile(csvContent, `${fileName}.csv`, "text/csv");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
        >
          <Download className="w-4 h-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={exportAsJSON} className="cursor-pointer">
          <FileJson className="w-4 h-4 mr-2 text-blue-600" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsText} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2 text-gray-600" />
          Export as TXT
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsCSV} className="cursor-pointer">
          <Table className="w-4 h-4 mr-2 text-green-600" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
