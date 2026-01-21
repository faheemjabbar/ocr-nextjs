'use client';

import * as React from 'react';
import { styled, useTheme, Theme, CSSObject } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import LogoutIcon from '@mui/icons-material/Logout';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

const drawerWidth = 240;

const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
});

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open: boolean }>(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}));

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
  const theme = useTheme();
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
      
      // Subscribe to realtime changes
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
    { label: 'PDFs', icon: <PictureAsPdfIcon />, docs: documents.pdfs, color: '#dc2626' },
    { label: 'DOCX', icon: <DescriptionIcon />, docs: documents.docx, color: '#2563eb' },
    { label: 'Images', icon: <ImageIcon />, docs: documents.images, color: '#16a34a' },
  ];

  return (
    <Drawer 
      variant="permanent" 
      open={open}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      sx={{
        opacity: dimmed ? 0.3 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: dimmed ? 'none' : 'auto',
      }}
    >
      {/* User Profile Section */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          gap: 1,
          flexDirection: open ? 'row' : 'column',
        }}
      >
        <Avatar 
          sx={{ 
            bgcolor: 'primary.main', 
            width: 32, 
            height: 32,
            fontSize: '0.875rem',
          }}
        >
          {getUserInitials()}
        </Avatar>
        {open && (
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {session?.user?.email?.split('@')[0]}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
            >
              {session?.user?.email}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider />

      {/* Document Categories */}
      <List>
        {items.map((item) => (
          <Box key={item.label}>
            <ListItem disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                onClick={() => {
                  const expandKey = `expand_${item.label}`;
                  setExpandedCategory(prev => prev === expandKey ? null : expandKey);
                }}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: item.color,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={`${item.label} (${item.docs.length})`}
                  sx={{ opacity: open ? 1 : 0 }}
                />
              </ListItemButton>
            </ListItem>

            {/* Document List */}
            {open && expandedCategory === `expand_${item.label}` && item.docs.length > 0 && (
              <List component="div" disablePadding>
                {item.docs.map((doc) => (
                  <ListItemButton
                    key={doc.id}
                    sx={{
                      pl: 4,
                      backgroundColor: selectedDocumentId === doc.id ? 'action.selected' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                    onClick={() => onDocumentSelect?.(doc)}
                  >
                    <ListItemText
                      primary={doc.extracted_data?.original_name || getFileName(doc.file_path)}
                      secondary={new Date(doc.created_at).toLocaleDateString()}
                      primaryTypographyProps={{
                        variant: 'body2',
                        noWrap: true,
                        sx: { fontSize: '0.875rem' },
                      }}
                      secondaryTypographyProps={{
                        variant: 'caption',
                        sx: { fontSize: '0.75rem' },
                      }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        ))}
      </List>

      {/* Logout Button at Bottom */}
      <Box sx={{ marginTop: 'auto', borderTop: 1, borderColor: 'divider' }}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 3 : 'auto',
                justifyContent: 'center',
                color: 'error.main',
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Logout"
              sx={{ opacity: open ? 1 : 0 }}
              primaryTypographyProps={{
                sx: { color: 'error.main' }
              }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
}