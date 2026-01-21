"use client";

import { FileText, Upload, X, Image as ImageIcon, FileUp, CheckCircle2 } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "./ui/input";
import { Progress } from "./ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface FileUploadProgress {
  progress: number;
  file: File;
}

const FileColors = {
  pdf: {
    bgColor: "from-red-50 to-red-100",
    fillColor: "text-red-600",
    borderColor: "border-red-300",
    badgeColor: "bg-red-100 text-red-700",
  },
  docx: {
    bgColor: "from-blue-50 to-blue-100",
    fillColor: "text-blue-600",
    borderColor: "border-blue-300",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  image: {
    bgColor: "from-green-50 to-green-100",
    fillColor: "text-green-600",
    borderColor: "border-green-300",
    badgeColor: "bg-green-100 text-green-700",
  },
};

export default function FileUpload({
  onFileUpload,
  setParsedText,
  setFileType,
  maxSize,
  onDocumentCreated,
}: {
  onFileUpload: (file: File) => void;
  setParsedText: (text: string) => void;
  setFileType: (type: string) => void;
  maxSize: number;
  onDocumentCreated?: (doc: any) => void;
}) {
  const [filesToUpload, setFilesToUpload] = useState<FileUploadProgress[]>([]);
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, []);

  const getFileIconAndColor = (file: File) => {
    if (file.type.includes("pdf")) {
      return {
        icon: <FileText size={24} className={FileColors.pdf.fillColor} />,
        color: FileColors.pdf.bgColor,
        border: FileColors.pdf.borderColor,
        badge: FileColors.pdf.badgeColor,
        type: "PDF"
      };
    } else if (file.type.includes("wordprocessingml")) {
      return {
        icon: <FileText size={24} className={FileColors.docx.fillColor} />,
        color: FileColors.docx.bgColor,
        border: FileColors.docx.borderColor,
        badge: FileColors.docx.badgeColor,
        type: "DOCX"
      };
    } else if (file.type.includes("image")) {
      return {
        icon: <ImageIcon size={24} className={FileColors.image.fillColor} />,
        color: FileColors.image.bgColor,
        border: FileColors.image.borderColor,
        badge: FileColors.image.badgeColor,
        type: "IMAGE"
      };
    }
    return null;
  };

  const removeFile = (file: File) => {
    setFilesToUpload((prevUploadProgress) => {
      return prevUploadProgress.filter((item) => item.file !== file);
    });
  };

  const uploadFileToApi = async (file: File) => {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "❌ Authentication Error",
        description: "User not authenticated. Please log in again.",
      });
      // Reset state
      setFilesToUpload([]);
      setParsedText("");
      setFileType("");
      return false;
    }

    const formData = new FormData();
    formData.append("FILE", file);
    formData.append("userId", userId);

    try {
      const response = await fetch("/api/parse-data", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload file");
      }

      const result = await response.json();
      
      if (file.type.startsWith("image/")) {
        if (result.success) {
          toast({
            title: "🔄 Processing Image",
            description: "Extracting data from your image...",
          });
          
          let pollCount = 0;
          const maxPolls = 60;
          const pollInterval = setInterval(async () => {
            pollCount++;
            
            const { data, error } = await supabase
              .from("documents")
              .select("extracted_data, status")
              .eq("file_path", result.filePath)
              .single();

            if (error) {
              console.error("Polling error:", error);
              return;
            }

            if (data?.extracted_data && Object.keys(data.extracted_data).length > 0) {
              clearInterval(pollInterval);
              setParsedText(JSON.stringify(data.extracted_data, null, 2));
              setFileType(file.type);
              
              // Fetch the full document and pass it back
              const { data: fullDoc } = await supabase
                .from("documents")
                .select("*")
                .eq("file_path", result.filePath)
                .single();
              
              if (fullDoc && onDocumentCreated) {
                onDocumentCreated(fullDoc);
              }
              
              toast({
                title: "✅ Success",
                description: "Data extracted successfully!",
              });
            } else if (data?.status === "failed") {
              clearInterval(pollInterval);
              toast({
                variant: "destructive",
                title: "❌ Extraction Failed",
                description: "Could not extract data from image",
              });
            } else if (pollCount >= maxPolls) {
              clearInterval(pollInterval);
              toast({
                variant: "destructive",
                title: "⏱️ Timeout",
                description: "Processing took too long. Please check your documents.",
              });
            }
          }, 2000);
        }
      } else {
        // Handle PDF/DOCX files
        if (result.success && result.documentId) {
          setParsedText(result.parsedText);
          setFileType(result.fileType);
          
          // Fetch the full document and pass it back
          const { data: fullDoc } = await supabase
            .from("documents")
            .select("*")
            .eq("id", result.documentId)
            .single();
          
          if (fullDoc && onDocumentCreated) {
            onDocumentCreated(fullDoc);
          }
          
          toast({
            title: "✅ Success",
            description: "Document processed successfully!",
          });
        }
      }
      return true;
    } catch (error) {
      // Reset loading state by calling setParsedText with empty string
      setParsedText("");
      setFileType("");
      
      toast({
        variant: "destructive",
        title: "❌ Upload Failed",
        description: (error as Error).message,
      });
      
      // Remove the file from the upload list
      setFilesToUpload([]);
      return false;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 1) {
        toast({
          variant: "destructive",
          title: "⚠️ Multiple files not allowed",
          description: "Please upload only one file at a time.",
        });
        return;
      }

      const file = acceptedFiles[0];
      setFilesToUpload([{ file, progress: 100 }]);
      
      // Trigger loading state first
      onFileUpload(file);
      
      // Then upload the file
      const success = await uploadFileToApi(file);
      
      // If upload failed, reset loading state
      if (!success) {
        setParsedText("");
        setFileType("");
      }
    },
    [onFileUpload, userId, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    maxSize: maxSize,
  });

  return (
    <div className="w-full space-y-6">
      <div>
        <label
          {...getRootProps()}
          className={`relative flex flex-col items-center justify-center w-full py-16 px-8 border-3 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
            isDragActive
              ? "border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 scale-105"
              : "border-gray-300 bg-gradient-to-br from-gray-50 to-white hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50/50 hover:to-indigo-50/50"
          } shadow-sm hover:shadow-md`}
        >
          <div className="text-center space-y-5">
            <div className={`mx-auto w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragActive 
                ? "bg-gradient-to-br from-blue-500 to-indigo-600 scale-110" 
                : "bg-gradient-to-br from-gray-100 to-gray-200"
            }`}>
              <FileUp size={40} className={isDragActive ? "text-white" : "text-gray-600"} />
            </div>
            
            <div>
              <p className="text-xl font-bold text-gray-800 mb-2">
                {isDragActive ? "Drop your file here" : "Drag & drop your file"}
              </p>
              <p className="text-sm text-gray-500">
                or click to browse from your device
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Badge variant="outline" className="px-4 py-2 bg-white border-gray-300 text-gray-700 font-medium">
                <FileText className="w-3 h-3 mr-1.5" />
                PDF
              </Badge>
              <Badge variant="outline" className="px-4 py-2 bg-white border-gray-300 text-gray-700 font-medium">
                <FileText className="w-3 h-3 mr-1.5" />
                DOCX
              </Badge>
              <Badge variant="outline" className="px-4 py-2 bg-white border-gray-300 text-gray-700 font-medium">
                <ImageIcon className="w-3 h-3 mr-1.5" />
                Images
              </Badge>
            </div>

            <div className="pt-2">
              <p className="text-xs text-gray-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Maximum file size: 8MB
              </p>
            </div>
          </div>
        </label>
        <Input
          {...getInputProps()}
          id="dropzone-file"
          accept=".pdf,.docx,.png,.jpg,.jpeg,.gif,.webp"
          type="file"
          className="hidden"
        />
      </div>

      {filesToUpload.length > 0 && (
        <div className="space-y-3">
          <p className="font-semibold text-sm text-gray-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Uploaded File
          </p>
          
          {filesToUpload.map((fileUploadProgress) => {
            const fileDetails = getFileIconAndColor(fileUploadProgress.file);
            return (
              <Card
                key={fileUploadProgress.file.lastModified}
                className={`border-2 ${fileDetails?.border} bg-gradient-to-r ${fileDetails?.color} hover:shadow-lg transition-all duration-300 overflow-hidden group`}
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm">
                      {fileDetails?.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {fileUploadProgress.file.name}
                          </p>
                          <Badge className={fileDetails?.badge}>
                            {fileDetails?.type}
                          </Badge>
                        </div>
                        <span className="text-xs font-bold text-gray-600 flex-shrink-0">
                          {fileUploadProgress.progress}%
                        </span>
                      </div>
                      
                      <Progress
                        value={fileUploadProgress.progress}
                        className="h-2 bg-white/50"
                      />
                      
                      <p className="text-xs text-gray-600">
                        {(fileUploadProgress.file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>

                    <button
                      onClick={() => removeFile(fileUploadProgress.file)}
                      className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center hover:bg-red-600 hover:scale-110"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}