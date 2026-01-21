import { NextRequest, NextResponse } from "next/server"; 
import { promises as fs } from "fs"; 
import { v4 as uuidv4 } from "uuid"; 
import PDFParser from "pdf2json";
import mammoth from "mammoth";
import { tmpdir } from "os";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

export async function POST(req: NextRequest) {
  console.log('=== API Route Called ===');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('Supabase URL exists:', !!supabaseUrl);
  console.log('Supabase Key exists:', !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    return new NextResponse(JSON.stringify({ 
      error: "Server configuration error" 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const formData: FormData = await req.formData();
    const uploadedFiles = formData.getAll("FILE");
    const userId = formData.get("userId") as string;
    
    console.log('User ID:', userId);
    console.log('Files count:', uploadedFiles.length);
    
    if (!userId) {
      return new NextResponse(JSON.stringify({ 
        error: "User ID is required" 
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let fileName = "";
    let parsedText = "";
    let fileType = "";
    let originalFileName = "";

    if (uploadedFiles && uploadedFiles.length > 0) {
      const uploadedFile = uploadedFiles[0];
      console.log('Uploaded file name:', uploadedFile instanceof File ? uploadedFile.name : 'unknown');
      console.log('Uploaded file type:', uploadedFile instanceof File ? uploadedFile.type : 'unknown');

      if (uploadedFile instanceof File) {
        fileName = uuidv4();
        fileType = uploadedFile.type;
        originalFileName = uploadedFile.name;

        const fileBuffer = Buffer.from(await uploadedFile.arrayBuffer());
        console.log('File buffer size:', fileBuffer.length, 'bytes');

        // Handle image files
        if (fileType.startsWith("image/")) {
          console.log('=== Processing Image ===');
          
          // Check if user has already uploaded an image
          console.log('Checking if user has already uploaded an image...');
          const { data: existingImages, error: checkError } = await supabase
            .from("documents")
            .select("id")
            .eq("user_id", userId)
            .like("file_type", "image/%")
            .limit(1);

          if (checkError) {
            console.error("Error checking existing images:", checkError);
            return new NextResponse(JSON.stringify({ 
              error: "Error checking user documents", 
              details: checkError.message
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          if (existingImages && existingImages.length > 0) {
            console.log('User has already uploaded an image');
            return new NextResponse(JSON.stringify({ 
              error: "You have already uploaded an image. Only 1 image extraction is allowed per user.", 
            }), { 
              status: 403,
              headers: { "Content-Type": "application/json" }
            });
          }

          try {
            const originalSize = fileBuffer.length;
            console.log(`Original image size: ${(originalSize / 1024).toFixed(2)} KB`);

            console.log('Starting compression...');
            let compressedBuffer = await sharp(fileBuffer)
              .resize(2000, 2000, {
                fit: 'inside',
                withoutEnlargement: true,
              })
              .jpeg({ quality: 85 })
              .toBuffer();

            const compressedSize = compressedBuffer.length;
            console.log(`Compressed image size: ${(compressedSize / 1024).toFixed(2)} KB`);

            const fileExt = 'jpg';
            const filePath = `${userId}/${fileName}.${fileExt}`;
            
            console.log('Uploading to storage bucket: raw-uploads');
            console.log('File path:', filePath);
            
            const { data, error } = await supabase.storage
              .from("raw-uploads")
              .upload(filePath, compressedBuffer, {
                contentType: 'image/jpeg',
                upsert: false,
              });

            if (error) {
              console.error("Storage upload error:", error);
              return new NextResponse(JSON.stringify({ 
                error: "Error uploading image to storage", 
                details: error.message,
                errorObj: error
              }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
              });
            }

            console.log('✅ Storage upload successful:', data);

            console.log('Inserting into documents table...');
            const { data: insertData, error: dbError } = await supabase
              .from("documents")
              .insert({
                user_id: userId,
                file_path: filePath,
                file_type: 'image/jpeg',
                status: "processing",
                extracted_data: null,
              })
              .select();

            if (dbError) {
              console.error("Database insert error:", dbError);
              return new NextResponse(JSON.stringify({ 
                error: "Error saving document record", 
                details: dbError.message,
                errorObj: dbError
              }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
              });
            }

            console.log('✅ Database insert successful:', insertData);

            // Invoke edge function for image extraction
            console.log('Invoking edge function for image extraction...');
            try {
              const { data: edgeData, error: edgeError } = await supabase.functions.invoke('extract-document', {
                body: {
                  record: {
                    id: insertData?.[0]?.id,
                    file_path: filePath,
                    user_id: userId,
                  },
                },
              });

              if (edgeError) {
                console.error('Edge function error:', edgeError);
                // Don't fail the whole request, just log the error
                console.warn('Edge function invocation failed, but continuing...');
              } else {
                console.log('✅ Edge function invoked successfully:', edgeData);
              }
            } catch (edgeError) {
              console.error('Error invoking edge function:', edgeError);
              // Don't fail the whole request, just log the error
              console.warn('Edge function invocation failed, but continuing...');
            }

            return new NextResponse(JSON.stringify({ 
              success: true, 
              filePath,
              documentId: insertData?.[0]?.id,
              originalSize: `${(originalSize / 1024).toFixed(2)} KB`,
              compressedSize: `${(compressedSize / 1024).toFixed(2)} KB`,
            }), {
              headers: { "Content-Type": "application/json" }
            });
          } catch (error) {
            console.error("Error processing image:", error);
            return new NextResponse(JSON.stringify({ 
              error: "Error processing image file", 
              details: (error as Error).message
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }
        }
        // Handle PDF files
        else if (fileType === "application/pdf") {
          const tempFilePath = join(tmpdir(), `${fileName}.pdf`);
          await fs.writeFile(tempFilePath, new Uint8Array(fileBuffer)); 
          
          const pdfParser = new (PDFParser as any)(null, 1);

          pdfParser.on("pdfParser_dataError", (errData: any) =>
            console.log(errData.parserError)
          );

          pdfParser.on("pdfParser_dataReady", () => {
            console.log((pdfParser as any).getRawTextContent());
            parsedText = (pdfParser as any).getRawTextContent();
          });

          await new Promise((resolve, reject) => {
            pdfParser.loadPDF(tempFilePath);
            pdfParser.on("pdfParser_dataReady", resolve);
            pdfParser.on("pdfParser_dataError", reject);
          });

          // Upload PDF to storage
          const fileExt = 'pdf';
          const filePath = `${userId}/${fileName}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from("raw-uploads")
            .upload(filePath, fileBuffer, {
              contentType: 'application/pdf',
              upsert: false,
            });

          if (error) {
            console.error("Storage upload error:", error);
            return new NextResponse(JSON.stringify({ 
              error: "Error uploading PDF to storage", 
              details: error.message
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          // Save to database
          const { data: insertData, error: dbError } = await supabase
            .from("documents")
            .insert({
              user_id: userId,
              file_path: filePath,
              file_type: 'application/pdf',
              status: "completed",
              extracted_data: { text: parsedText, original_name: originalFileName },
            })
            .select();

          if (dbError) {
            console.error("Database insert error:", dbError);
            return new NextResponse(JSON.stringify({ 
              error: "Error saving document record", 
              details: dbError.message
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }

          return new NextResponse(JSON.stringify({ 
            success: true,
            parsedText,
            fileType,
            fileName,
            documentId: insertData?.[0]?.id,
          }), {
            headers: { "Content-Type": "application/json" }
          });
        } 
        // Handle DOCX files
        else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          try {
            const result = await mammoth.convertToHtml({ buffer: fileBuffer });
            parsedText = result.value;
            
            if (result.messages.length > 0) {
              console.log("Mammoth warnings:", result.messages);
            }

            // Upload DOCX to storage
            const fileExt = 'docx';
            const filePath = `${userId}/${fileName}.${fileExt}`;
            
            const { data, error } = await supabase.storage
              .from("raw-uploads")
              .upload(filePath, fileBuffer, {
                contentType: fileType,
                upsert: false,
              });

            if (error) {
              console.error("Storage upload error:", error);
              return new NextResponse(JSON.stringify({ 
                error: "Error uploading DOCX to storage", 
                details: error.message
              }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
              });
            }

            // Save to database
            const { data: insertData, error: dbError } = await supabase
              .from("documents")
              .insert({
                user_id: userId,
                file_path: filePath,
                file_type: fileType,
                status: "completed",
                extracted_data: { html: parsedText, original_name: originalFileName },
              })
              .select();

            if (dbError) {
              console.error("Database insert error:", dbError);
              return new NextResponse(JSON.stringify({ 
                error: "Error saving document record", 
                details: dbError.message
              }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
              });
            }

            return new NextResponse(JSON.stringify({ 
              success: true,
              parsedText,
              fileType,
              fileName,
              documentId: insertData?.[0]?.id,
            }), {
              headers: { "Content-Type": "application/json" }
            });
          } catch (error) {
            console.error("Error parsing DOCX:", error);
            return new NextResponse(JSON.stringify({ 
              error: "Error parsing DOCX file",
              details: (error as Error).message
            }), { 
              status: 500,
              headers: { "Content-Type": "application/json" }
            });
          }
        } 
        else {
          return new NextResponse(JSON.stringify({ 
            error: "Unsupported file type. Please upload PDF, DOCX, or image files."
          }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else {
        console.log('Uploaded file is not in the expected format.');
        return new NextResponse(JSON.stringify({ 
          error: "Uploaded file is not in the expected format."
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      console.log('No files found.');
      return new NextResponse(JSON.stringify({ error: "No File Found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      });
    }
  } catch (error) {
    console.error('=== API Route Error ===');
    console.error('Error:', error);
    return new NextResponse(JSON.stringify({ 
      error: "Internal server error", 
      details: (error as Error).message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}