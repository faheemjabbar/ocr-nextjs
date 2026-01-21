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
import { FileText, Loader2, Sparkles, Upload, Download, Share2 } from "lucide-react";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const theme = createTheme({
  palette: {
    primary: {
      main: '#3b82f6',
    },
  },
});

import Sidebar from '@/components/ui/Sidebar';

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
  };

  const isPDF = fileType === "application/pdf";
  const isDOCX = fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isImage = fileType.startsWith("image/");

  // Parse extracted data if it's JSON
  let extractedFields = null;
  if (isImage && parsedText) {
    try {
      const parsed = JSON.parse(parsedText);
      extractedFields = parsed.fields || [];
    } catch (e) {
      console.error("Failed to parse extracted data:", e);
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
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#fafafa' }}>
        <Sidebar 
          dimmed={open} 
          onDocumentSelect={handleDocumentSelect}
          selectedDocumentId={selectedDocument?.id}
        />

        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            position: 'relative',
          }}
        >
          {open && (
            <div 
              className="fixed inset-0 bg-black/50 z-40"
              style={{ marginLeft: '57px' }}
            />
          )}
          
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
            {/* Modern Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm top-0 z-30">
              <div className="max-w-7xl mx-auto px-6 lg:px-8" style={{ height: '72px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Document Parser
                    </h1>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI-powered text extraction
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 relative z-50">
              <div className="flex flex-col items-center justify-center">
                {!parsedText && !loading && (
                  <div className="text-center mb-8 space-y-3">
                    <h2 className="text-4xl font-bold text-gray-800">
                      Transform Your Documents
                    </h2>
                    <p className="text-lg text-gray-600 max-w-2xl">
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
                  <DialogContent className="sm:max-w-[550px] p-0 bg-white rounded-3xl shadow-2xl overflow-hidden border-0">
                    <DialogHeader className="p-8 pb-6 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600">
                      <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
                        <Upload className="w-6 h-6" />
                        Upload Your Document
                      </DialogTitle>
                      <p className="text-blue-50 text-sm mt-2">
                        Supported formats: PDF, DOCX, and images
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
                        <p className="text-xl font-semibold text-gray-800">Processing your document</p>
                        <p className="text-sm text-gray-500">This may take a few moments...</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {parsedText && !loading && (
                  <Card className="mt-12 w-full max-w-6xl border-0 shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200/50">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="text-2xl font-bold text-gray-900">
                              Extracted Content
                            </h3>
                            <Badge variant="outline" className={`${getFileTypeInfo().color} border`}>
                              {getFileTypeInfo().label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {selectedDocument?.extracted_data?.original_name || uploadedFile?.name}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Share2 className="w-4 h-4" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <CardContent className="p-8">
                      {isPDF ? (
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl border border-gray-200 shadow-inner max-h-[600px] overflow-y-auto">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed">
                            {parsedText}
                          </pre>
                        </div>
                      ) : isDOCX ? (
                        <div 
                          className="prose prose-lg max-w-none bg-white p-8 rounded-2xl border border-gray-200 shadow-sm max-h-[600px] overflow-y-auto"
                          contentEditable
                          suppressContentEditableWarning
                          dangerouslySetInnerHTML={{ __html: parsedText }}
                          style={{
                            outline: 'none',
                            lineHeight: '1.8',
                          }}
                        />
                      ) : isImage && extractedFields ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {extractedFields.map((field: any, index: number) => (
                              <Card 
                                key={index}
                                className="bg-gradient-to-br from-white to-blue-50/50 border-blue-200/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                              >
                                <CardContent className="p-5">
                                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" />
                                    {formatLabel(field.key)}
                                  </p>
                                  <p className="text-lg font-semibold text-gray-900 break-words">
                                    {field.value}
                                  </p>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                          
                          {extractedFields.length === 0 && (
                            <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 text-lg font-medium">No data extracted from the image</p>
                              <p className="text-gray-400 text-sm mt-2">Try uploading a clearer image</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-8 rounded-2xl border border-gray-200 shadow-inner max-h-[600px] overflow-y-auto">
                          <p className="text-gray-800 leading-relaxed">{parsedText}</p>
                        </div>
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
                      { icon: Sparkles, title: 'Image OCR', desc: 'Extract text and data from images using AI' }
                    ].map((feature, i) => (
                      <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow bg-white/80 backdrop-blur">
                        <CardContent className="p-6 text-center space-y-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto">
                            <feature.icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                          <p className="text-sm text-gray-600">{feature.desc}</p>
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
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default HomePage;