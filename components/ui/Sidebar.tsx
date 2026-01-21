'use client';

import * as React from 'react';
import { ChevronLeft, FileText, Image as ImageIcon, LogOut, File } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { Button } from './button';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  file_path: string;
  file_type: string;
  status: string;
  created_at: string;
  extracted_data: any;
}

interface SidebarProps {
  dimmed?: boolean;
  onDocumentSelect?: (document: Document) => void;
  selectedDocumentId?: string | null;
}

export default function Sidebar({ dimmed = false, onDocumentSelect, selectedDocumentId }: SidebarProps) {
  const [open, setOpen] = React.useState(false);
  const [session, setSession] = React.useState<Session | null>(null);
  const [expandedCategory, setExpandedCategory] = React.useState<string | null>(null);
  const [documents, setDocuments] = React.useState<{
    pdfs: Document[];
    docx: Document[];
    images: Document[];
  }>({
    pdfs: [],
    docx: [],
    images: [],
  });

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    if (session?.user) {
      fetchDocuments();
      
      const channel = supabase
        .channel('documents-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            fetchDocuments();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const fetchDocuments = async () => {
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching documents:', error);
      return;
    }

    const pdfs = data.filter(doc => doc.file_type === 'application/pdf');
    const docx = data.filter(doc => doc.file_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const images = data.filter(doc => doc.file_type.startsWith('image/'));

    setDocuments({ pdfs, docx, images });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getFileName = (filePath: string) => {
    return filePath.split('/').pop() || filePath;
  };

  const getUserInitials = () => {
    const email = session?.user?.email || '';
    return email.charAt(0).toUpperCase();
  };

  const items = [
    { label: 'PDFs', icon: FileText, docs: documents.pdfs, color: 'text-red-600 dark:text-red-400' },
    { label: 'DOCX', icon: File, docs: documents.docx, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Images', icon: ImageIcon, docs: documents.images, color: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-50",
        open ? "w-60" : "w-16",
        dimmed && "opacity-30 pointer-events-none"
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex flex-col h-full">
        {/* User Profile Section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className={cn(
            "flex items-center gap-3",
            !open && "justify-center flex-col gap-2"
          )}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {getUserInitials()}
            </div>
            {open && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {session?.user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session?.user?.email}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Document Categories */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {items.map((item) => (
              <div key={item.label} className="mb-1">
                <button
                  onClick={() => {
                    const expandKey = `expand_${item.label}`;
                    setExpandedCategory(prev => prev === expandKey ? null : expandKey);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
                    !open && "justify-center"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 flex-shrink-0", item.color)} />
                  {open && (
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 text-left">
                      {item.label} ({item.docs.length})
                    </span>
                  )}
                </button>

                {/* Document List */}
                {open && expandedCategory === `expand_${item.label}` && item.docs.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.docs.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => onDocumentSelect?.(doc)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs transition-colors",
                          selectedDocumentId === doc.id
                            ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                        )}
                      >
                        <p className="font-medium truncate">
                          {doc.extracted_data?.original_name || getFileName(doc.file_path)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Logout Button */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400",
              !open && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {open && (
              <span className="text-sm font-medium">Logout</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
