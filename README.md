# Document Parser

A modern web application for extracting text and data from PDF, DOCX, and image files with advanced analytics and export capabilities. Built with Next.js, React, and Supabase.

⚠️ Note: Image OCR is powered by Supabase Edge Functions and requires additional backend setup (see below).

## Demo

https://github.com/user-attachments/assets/3fb39e65-9229-4551-9fd4-4b5e544eb021


## Features

### Core Functionality
- **Multi-format Support**: Upload and parse PDF, DOCX, and image files
- **Text Extraction**: Automatically extract text content from documents
- **Image Data Extraction**: Extract structured data from images using AI-powered OCR
- **User Authentication**: Secure login and signup with Supabase Auth
- **Real-time Processing**: Live progress tracking for document uploads

### Advanced Features
- **Analytics Dashboard**: 
  - View total documents processed
  - Track document types breakdown (PDF, DOCX, Images)
  - Monitor processing status (Completed, Processing, Failed)
  - Visual progress bars and statistics

- **Export Options**:
  - Export extracted data as JSON, CSV, or TXT
  - Download with proper formatting
  - Preserve data structure for images

- **Document Search**:
  - Search within extracted content
  - Real-time text highlighting
  - Clear and intuitive interface

- **Document Management**:
  - Browse all uploaded documents via sidebar
  - Filter by document type
  - View document history
  - Quick access to previously processed files

### UI/UX
- **Modern Interface**: Clean, responsive design with gradient backgrounds
- **Dark Theme**: Toggle between light and dark modes with persistent preference
- **Drag-and-Drop Upload**: Easy file upload with visual feedback
- **File Size Limit**: Supports files up to 8MB
- **Loading States**: Beautiful animated loaders during processing
- **Toast Notifications**: Real-time feedback for all operations

## Tech Stack

- **Framework**: Next.js 16
- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI, Lucide Icons
- **Authentication**: Supabase Auth
- **Database**: Supabase
- **Document Parsing**: 
  - PDF: pdf2json
  - DOCX: mammoth
  - Images: AI-powered extraction

## Prerequisites

- Node.js >= 18.17.0
- npm or yarn
- Supabase account

## Installation

1. Clone the repository:
```bash
git clone https://github.com/faheemjabbar/ocr-nextjs
cd ocr-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Sign Up/Login**: Create an account or log in with your credentials
2. **Upload Document**: Click "Upload Document" and select a file (PDF, DOCX, or image)
3. **View Results**: The extracted text or data will be displayed automatically
4. **Supported Formats**:
   - PDF files (.pdf)
   - Word documents (.docx)
   - Images (.png, .jpg, .jpeg, .gif, .webp)
  
## Image OCR
  
Image processing is not handled directly in the Next.js API route.

How Image OCR Works

- Images are uploaded to Supabase Storage
- A document record is created in the database
- The frontend explicitly calls a Supabase Edge Function

The Edge Function:

- Downloads the image from storage
- Sends it to an OCR provider
- Stores structured results in the database

## Required Setup

To enable image OCR:

- You must create your own Supabase Edge Function
- Add authentication verification inside the function
- Configure environment variables in Supabase

## Project Structure

```
├── app/
│   ├── api/
│   │   └── parse-data/      # API route for document parsing
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page with auth logic
├── components/
│   ├── Auth.tsx              # Authentication component
│   ├── FileUploader.tsx      # File upload component
│   ├── HomePage.tsx          # Main application interface
│   └── ui/                   # Reusable UI components
├── lib/
│   ├── supabase.ts           # Supabase client configuration
│   └── utils.ts              # Utility functions
└── public/                   # Static assets
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

