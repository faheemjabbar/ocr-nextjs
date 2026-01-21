"use client";
import React, { useState } from "react";
import { useToast } from "./ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FileUpload from "./FileUploader";
import { FileText, Loader2, Sparkles, Upload, BarChart3, Moon, Sun, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AnalyticsDashboard from "./AnalyticsDashboard";
import ExportOptions from "./ExportOptions";
import DocumentSearch from "./DocumentSearch";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import Sidebar from '@/components/ui/Sidebar';
import TiptapEditor from "./TiptapEditor";
import { supabase } from "@/lib/supabase";

interface Document {
  id: string;
  file_path: string;
  file_type: string;
  status: string;
  created_at: string;
  extracted_data: any;
}

function HomePage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();
  const [parsedText, setParsedText] = useState("");
  const [fileType, setFileType] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const { theme, toggleTheme } = useTheme();

  const handleFileUpload = async (file: File) => {
    setUploadedFile(() => {
      return file;
    });

    setOpen(() => {
      return false;
    });
    toast({
      variant: "default",
      title: "✨ File Uploaded",
      description: `${file.name} has been uploaded successfully.`,
    });
    setLoading(true);
    setSelectedDocument(null);
  };

  const handleDocumentSelect = (doc: Document) => {
    setSelectedDocument(doc);
    setFileType(doc.file_type);
    
    if (doc.file_type === 'application/pdf') {
      setParsedText(doc.extracted_data?.text || '');
    } else if (doc.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      setParsedText(doc.extracted_data?.html || '');
    } else if (doc.file_type.startsWith('image/')) {
      setParsedText(JSON.stringify(doc.extracted_data, null, 2));
    }
    
    setLoading(false);
    setSearchQuery("");
    setHighlightedText("");
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setHighlightedText(query);
    } else {
      setHighlightedText("");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setHighlightedText("");
  };

  const handleSaveChanges = async () => {
    if (!selectedDocument) return;

    const updatedData = { ...selectedDocument.extracted_data };
    
    if (isPDF) {
      updatedData.text = editedContent;
    } else if (isDOCX) {
      updatedData.html = editedContent;
    } else if (isImage) {
      // For images, convert HTML back to structured data
      updatedData.formatted_text = editedContent;
    }

    updatedData.edited_at = new Date().toISOString();

    const { error } = await supabase
      .from('documents')
      .update({ extracted_data: updatedData })
      .eq('id', selectedDocument.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "❌ Save Failed",
        description: error.message,
      });
    } else {
      setParsedText(editedContent);
      setIsEditing(false);
      toast({
        title: "✅ Changes Saved",
        description: "Your document has been updated successfully",
      });
    }
  };

  const getHighlightedContent = (content: string) => {
    if (!highlightedText || !content) return content;
    
    const regex = new RegExp(`(${highlightedText})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  };

  // Convert plain text to HTML with preserved formatting
  const textToHtml = (text: string) => {
    return text
      .split('\n')
      .map(line => line.trim() ? `<p>${line}</p>` : '<br/>')
      .join('');
  };

  // Format image fields as HTML
  const formatImageDataAsHtml = (fields: any[]) => {
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return '<p>No data extracted from the image</p>';
    }
    return fields
      .map(field => `<p><strong>${formatLabel(field.key)}:</strong> ${field.value}</p>`)
      .join('');
  };

  const isPDF = fileType === "application/pdf";
  const isDOCX = fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isImage = fileType.startsWith("image/");

  // Parse extracted data if it's JSON
  let extractedFields = null;
  if (isImage && parsedText) {
    try {
      const parsed = JSON.parse(parsedText);
      extractedFields = Array.isArray(parsed.fields) ? parsed.fields : [];
    } catch (e) {
      console.error("Failed to parse extracted data:", e);
      extractedFields = [];
    }
  }

  // Format field labels to be human-readable
  const formatLabel = (key: string) => {
    return key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFileTypeInfo = () => {
    if (isPDF) return { label: 'PDF Document', color: 'bg-red-100 text-red-700 border-red-200' };
    if (isDOCX) return { label: 'Word Document', color: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (isImage) return { label: 'Image File', color: 'bg-green-100 text-green-700 border-green-200' };
    return { label: 'Document', color: 'bg-gray-100 text-gray-700 border-gray-200' };
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar 
        dimmed={open} 
        onDocumentSelect={handleDocumentSelect}
        selectedDocumentId={selectedDocument?.id}
      />

      {/* Main Content Area */}
      <div className="flex-1 ml-16">
        {open && (
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            style={{ marginLeft: '64px' }}
          />
        )}
        
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative">
            {/* Modern Header */}
            <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 shadow-sm top-0 z-30">
              <div className="max-w-7xl mx-auto px-6 lg:px-8" style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Document Parser
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI-powered text extraction
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleTheme}
                    className="gap-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {theme === "dark" ? (
                      <Sun className="w-4 h-4" />
                    ) : (
                      <Moon className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="gap-2 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {showAnalytics ? "Hide" : "Show"} Analytics
                  </Button>
                </div>
              </div>
            </header>

            {/* Analytics Dashboard */}
            {showAnalytics && (
              <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
                <AnalyticsDashboard />
              </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 relative z-50">
              <div className="flex flex-col items-center justify-center">
                {!parsedText && !loading && (
                  <div className="text-center mb-8 space-y-3">
                    <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-100">
                      Transform Your Documents
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
                      Upload PDFs, Word documents, or images and extract text instantly with our advanced parsing technology
                    </p>
                  </div>
                )}

                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      disabled={loading}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-semibold py-6 px-10 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                      <Upload className="w-5 h-5 mr-2" />
                      Upload Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[550px] p-0 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border-0">
                    <DialogHeader className="p-8 pb-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
                      <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Upload className="w-6 h-6" />
                        Upload Your Document
                      </DialogTitle>
                      <p className="text-blue-50 text-sm mt-2">
                        Supported formats: PDF, DOCX, and Images
                      </p>
                    </DialogHeader>
                    <div className="p-8">
                      <FileUpload
                        onFileUpload={handleFileUpload}
                        setParsedText={(text: string) => {
                          setParsedText(text);
                          setLoading(false);
                        }}
                        setFileType={setFileType}
                        maxSize={8 * 1024 * 1024}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                {loading && (
                  <Card className="mt-16 w-full max-w-md border-0 shadow-2xl">
                    <CardContent className="p-12 flex flex-col items-center justify-center gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-400 rounded-full blur-xl opacity-50 animate-pulse"></div>
                        <Loader2 className="w-16 h-16 text-blue-600 animate-spin relative z-10" />
                      </div>
                      <div className="text-center space-y-2">
                        <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">Processing your document</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">This may take a few moments...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {parsedText && !loading && (
                  <Card className="mt-12 w-full max-w-6xl border-0 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200/50">
                      <div className="flex items-start justify-between mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-gray-900">
                              Extracted Content
                            </h3>
                            <Badge variant="outline" className={`${getFileTypeInfo().color} border`}>
                              {getFileTypeInfo().label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {selectedDocument?.extracted_data?.original_name || uploadedFile?.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setIsEditing(true);
                              // Convert content to HTML for editing
                              if (isPDF) {
                                setEditedContent(textToHtml(parsedText));
                              } else if (isDOCX) {
                                setEditedContent(parsedText);
                              } else if (isImage && extractedFields) {
                                setEditedContent(formatImageDataAsHtml(extractedFields));
                              } else {
                                setEditedContent(parsedText);
                              }
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <ExportOptions 
                            parsedText={parsedText}
                            fileType={fileType}
                            fileName={selectedDocument?.extracted_data?.original_name || uploadedFile?.name || "document"}
                          />
                        </div>
                      </div>
                      
                      {/* Search Bar */}
                      <div className="mt-4">
                        <DocumentSearch 
                          onSearch={handleSearch}
                          onClear={handleClearSearch}
                        />
                      </div>
                    </div>
                    
                    <CardContent className="p-8">
                      {isEditing ? (
                        <div className="space-y-4">
                          <TiptapEditor 
                            value={editedContent}
                            onChange={setEditedContent}
                          />
                          
                          <div className="flex gap-2 pt-4">
                            <Button 
                              onClick={handleSaveChanges}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Save Changes
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setIsEditing(false);
                                setEditedContent("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div 
                            className="prose prose-lg dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-8 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-h-[600px] overflow-y-auto"
                            dangerouslySetInnerHTML={{ 
                              __html: isPDF 
                                ? textToHtml(parsedText)
                                : isDOCX 
                                  ? parsedText 
                                  : isImage && extractedFields
                                    ? formatImageDataAsHtml(extractedFields)
                                    : parsedText
                            }}
                            style={{
                              lineHeight: '1.8',
                            }}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Feature Cards - Only show when no document is displayed */}
                {!parsedText && !loading && (
                  <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                    {[
                      { icon: FileText, title: 'PDF Support', desc: 'Extract text from any PDF document with precision' },
                      { icon: Upload, title: 'Word Files', desc: 'Parse DOCX files and preserve formatting' },
                      { icon: Sparkles, title: 'Image OCR', desc: 'Extract text and data from images using Nanonets AI' }
                    ].map((feature, i) => (
                      <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 dark:bg-gray-800/80 backdrop-blur">
                        <CardContent className="p-6 text-center space-y-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto">
                            <feature.icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{feature.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{feature.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </main>

            {/* Modern Footer */}
            <footer className="mt-auto py-8 text-center">
              <div className="max-w-7xl mx-auto px-6">
                <p className="text-sm text-gray-500">
                  Supports PDF, DOCX, and image files up to 8MB • Powered by advanced AI technology
                </p>
              </div>
            </footer>
          </div>
        </div>
      </div>
  );
}

export default function HomePageWithTheme() {
  return (
    <ThemeProvider>
      <HomePage />
    </ThemeProvider>
  );
}
