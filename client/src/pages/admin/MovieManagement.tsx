import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { apiRequest } from '@/lib/queryClient';
import { Movie, MovieUpload } from '@shared/schema';

import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Film, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  FileVideo, 
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Link,
  Info,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useToast } from '@/hooks/use-toast';

export default function MovieManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for tabs
  const [activeTab, setActiveTab] = useState('movies');
  
  // State for dialogs
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [openCopyDialog, setOpenCopyDialog] = useState(false);
  const [openAddUrlDialog, setOpenAddUrlDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  
  // Selected items
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<MovieUpload | null>(null);
  
  // Google Drive related state
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN');
  
  // Form state
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    releaseYear: new Date().getFullYear(),
    duration: 120,
    posterUrl: '',
    backdropUrl: '',
    videoUrl: '',
    rating: 'PG-13',
    genreIds: [] as number[],
    director: '',
    cast: [] as string[],
  });
  
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    submissionNotes: '',
  });
  
  const [reviewForm, setReviewForm] = useState({
    status: 'approved',
    notes: '',
  });
  
  const [copyForm, setCopyForm] = useState({
    sourceFolderId: '1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN',
    destinationFolderId: '10e9ynLaJdenTOQzuq3E9eoBM6JL5LDEF',
  });
  
  // Default URL form for adding movies directly from URL
  const defaultUrlForm = {
    title: '',
    description: '',
    releaseYear: new Date().getFullYear(),
    duration: 120,
    posterUrl: '',
    backdropUrl: '',
    rating: 'PG-13',
    videoUrl: '',
    genreIds: [] as number[],
    director: '',
  };
  
  const [urlForm, setUrlForm] = useState(defaultUrlForm);
  
  // State for sorting
  const [sortField, setSortField] = useState<string>('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // State for manual display order
  const [manualOrder, setManualOrder] = useState<number[]>([]);
  
  // Fetch movies
  const { data: movies = [], isLoading: isLoadingMovies } = useQuery<Movie[]>({
    queryKey: ['/api/admin/movies'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/movies');
      return res.json();
    },
  });
  
  // Initialize manual order when movies change
  useEffect(() => {
    if (movies.length && manualOrder.length === 0) {
      setManualOrder(movies.map(movie => movie.id));
    }
  }, [movies, manualOrder.length]);
  
  // Functions to move movies up or down in display order
  const moveMovieUp = (movieId: number) => {
    const currentIndex = manualOrder.indexOf(movieId);
    if (currentIndex > 0) {
      const newOrder = [...manualOrder];
      // Swap with the item above
      [newOrder[currentIndex - 1], newOrder[currentIndex]] = 
      [newOrder[currentIndex], newOrder[currentIndex - 1]];
      setManualOrder(newOrder);
      
      // Reset sort field to indicate we're using manual order
      setSortField('manual');
    }
  };
  
  const moveMovieDown = (movieId: number) => {
    const currentIndex = manualOrder.indexOf(movieId);
    if (currentIndex >= 0 && currentIndex < manualOrder.length - 1) {
      const newOrder = [...manualOrder];
      // Swap with the item below
      [newOrder[currentIndex], newOrder[currentIndex + 1]] = 
      [newOrder[currentIndex + 1], newOrder[currentIndex]];
      setManualOrder(newOrder);
      
      // Reset sort field to indicate we're using manual order
      setSortField('manual');
    }
  };
  
  // Sort movies based on current sort settings or manual order
  const sortedMovies = useMemo(() => {
    if (!movies.length) return [];
    
    // If we're using manual order
    if (sortField === 'manual' && manualOrder.length > 0) {
      // Create a map for O(1) lookups
      const indexMap = new Map(manualOrder.map((id, index) => [id, index]));
      
      return [...movies].sort((a, b) => {
        const aIndex = indexMap.get(a.id) ?? 9999;
        const bIndex = indexMap.get(b.id) ?? 9999;
        return aIndex - bIndex;
      });
    }
    
    // Otherwise use standard sorting
    return [...movies].sort((a, b) => {
      const aValue = a[sortField as keyof Movie];
      const bValue = b[sortField as keyof Movie];
      
      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const aLower = aValue.toLowerCase();
        const bLower = bValue.toLowerCase();
        
        if (sortOrder === 'asc') {
          return aLower > bLower ? 1 : -1;
        } else {
          return aLower < bLower ? 1 : -1;
        }
      } 
      
      // Handle numbers
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      }
      
      // Default comparison for other types
      return 0;
    });
  }, [movies, sortField, sortOrder, manualOrder]);
  
  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder('asc');
    }
  };
  
  // Fetch pending movie uploads
  const { data: pendingUploads = [], isLoading: isLoadingUploads } = useQuery<MovieUpload[]>({
    queryKey: ['/api/admin/movie-uploads'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/movie-uploads');
      return res.json();
    },
  });
  
  // Create movie mutation
  const createMovieMutation = useMutation({
    mutationFn: async (movie: any) => {
      const res = await apiRequest('POST', '/api/admin/movies', movie);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieCreated'),
        description: t('admin.movieCreatedSuccess'),
      });
      // Close dialog and reset forms depending on which form was submitted
      if (openCreateDialog) {
        setOpenCreateDialog(false);
        resetMovieForm();
      } 
      if (openAddUrlDialog) {
        setOpenAddUrlDialog(false);
        setUrlForm(defaultUrlForm);
      }
      // Invalidate movie queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.movieCreateFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Update movie mutation
  const updateMovieMutation = useMutation({
    mutationFn: async ({ id, movie }: { id: number, movie: any }) => {
      const res = await apiRequest('PATCH', `/api/movies/${id}`, movie);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieUpdated'),
        description: t('admin.movieUpdatedSuccess'),
      });
      setOpenEditDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.movieUpdateFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Delete movie mutation
  const deleteMovieMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/movies/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieDeleted'),
        description: t('admin.movieDeletedSuccess'),
      });
      setOpenDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.movieDeleteFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Create upload submission mutation
  const createUploadMutation = useMutation({
    mutationFn: async (upload: any) => {
      const res = await apiRequest('POST', '/api/admin/movie-uploads', upload);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.uploadSubmitted'),
        description: t('admin.uploadSubmittedSuccess'),
      });
      setOpenUploadDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movie-uploads'] });
      resetUploadForm();
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.uploadSubmitFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Update upload status mutation
  const updateUploadStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number, status: string, notes: string }) => {
      const res = await apiRequest('PATCH', `/api/admin/movie-uploads/${id}/status`, { status, notes });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.uploadReviewed'),
        description: t('admin.uploadReviewedSuccess'),
      });
      setOpenReviewDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movie-uploads'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.uploadReviewFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Copy movies from Google Drive mutation
  const copyDriveMoviesMutation = useMutation({
    mutationFn: async (data: { sourceFolderId: string, destinationFolderId: string }) => {
      const res = await apiRequest('POST', '/api/drive/copy', data);
      return res.json();
    },
    onSuccess: (data) => {
      // Show the instructions returned from the API
      if (data.instructions) {
        toast({
          title: data.message || t('admin.useUrlMethod'),
          description: data.instructions.join('\n'),
        });
      } else {
        toast({
          title: t('admin.driveMoviesCopied'),
          description: t('admin.driveMoviesCopiedSuccess').replace('{count}', data.details.filter((d: any) => d.success).length.toString()),
        });
      }
      
      // Don't close the dialog immediately to let user read instructions
      setTimeout(() => {
        setOpenCopyDialog(false);
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.driveMoviesCopyFailed'),
        variant: 'destructive',
      });
    }
  });
  
  // Fetch Google Drive files
  const fetchDriveFilesMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await apiRequest('GET', `/api/drive/files?folderId=${folderId}`);
      return res.json();
    },
    onSuccess: (data) => {
      setDriveFiles(data.files || []);
      setIsLoadingDriveFiles(false);
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.failedToFetchDriveFiles'),
        variant: 'destructive',
      });
      setIsLoadingDriveFiles(false);
    }
  });
  
  // Import movies from Google Drive
  const importDriveMoviesMutation = useMutation({
    mutationFn: async (movies: any[]) => {
      const res = await apiRequest('POST', '/api/admin/movies/import', { movies });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('admin.moviesImported'),
        description: t('admin.moviesImportedSuccess').replace('{count}', data.count.toString()),
      });
      setOpenImportDialog(false);
      setSelectedDriveFiles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.failedToImportMovies'),
        variant: 'destructive',
      });
    }
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Reset movie form
  const resetMovieForm = () => {
    setMovieForm({
      title: '',
      description: '',
      releaseYear: new Date().getFullYear(),
      duration: 120,
      posterUrl: '',
      backdropUrl: '',
      videoUrl: '',
      rating: 'PG-13',
      genreIds: [],
      director: '',
      cast: [],
    });
  };
  
  // Reset upload form
  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      videoUrl: '',
      submissionNotes: '',
    });
  };
  
  // Handle input change for movie form
  const handleMovieInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMovieForm({ ...movieForm, [name]: value });
  };
  
  // Handle input change for upload form
  const handleUploadInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUploadForm({ ...uploadForm, [name]: value });
  };
  
  // Handle input change for review form
  const handleReviewInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReviewForm({ ...reviewForm, [name]: value });
  };
  
  // Handle input change for copy form
  const handleCopyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCopyForm({ ...copyForm, [name]: value });
  };
  
  // Handle input change for URL form
  const handleUrlInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setUrlForm({ ...urlForm, [name]: value });
  };
  
  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    if (name === 'status') {
      setReviewForm({ ...reviewForm, [name]: value });
    } else {
      setMovieForm({ ...movieForm, [name]: value });
    }
  };
  
  // Handle genre selection (multi-select)
  const handleGenreChange = (genreId: string) => {
    const id = parseInt(genreId);
    const currentGenres = [...movieForm.genreIds];
    
    if (currentGenres.includes(id)) {
      setMovieForm({ 
        ...movieForm, 
        genreIds: currentGenres.filter(g => g !== id) 
      });
    } else {
      setMovieForm({ 
        ...movieForm, 
        genreIds: [...currentGenres, id] 
      });
    }
  };
  
  // Handle cast input (comma-separated string)
  const handleCastChange = (value: string) => {
    const castArray = value.split(',').map(item => item.trim()).filter(Boolean);
    setMovieForm({ ...movieForm, cast: castArray });
  };
  
  // Open edit dialog with movie data
  const openMovieEdit = (movie: Movie) => {
    setSelectedMovie(movie);
    setMovieForm({
      title: movie.title,
      description: movie.description,
      releaseYear: movie.releaseYear,
      duration: movie.duration,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      videoUrl: movie.videoUrl || '',
      rating: movie.rating,
      genreIds: movie.genreIds,
      director: movie.director || '',
      cast: movie.cast || [],
    });
    setOpenEditDialog(true);
  };
  
  // Open delete confirmation dialog
  const openMovieDelete = (movie: Movie) => {
    setSelectedMovie(movie);
    setOpenDeleteDialog(true);
  };
  
  // Open review upload dialog
  const openUploadReview = (upload: MovieUpload) => {
    setSelectedUpload(upload);
    setReviewForm({
      status: 'approved',
      notes: '',
    });
    setOpenReviewDialog(true);
  };
  
  // Handle create movie form submit
  const handleCreateMovie = (e: React.FormEvent) => {
    e.preventDefault();
    createMovieMutation.mutate(movieForm);
  };
  
  // Handle edit movie form submit
  const handleUpdateMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMovie) {
      updateMovieMutation.mutate({ 
        id: selectedMovie.id, 
        movie: movieForm 
      });
    }
  };
  
  // Handle delete movie confirmation
  const handleDeleteMovie = () => {
    if (selectedMovie) {
      deleteMovieMutation.mutate(selectedMovie.id);
    }
  };
  
  // Handle upload submission
  const handleSubmitUpload = (e: React.FormEvent) => {
    e.preventDefault();
    createUploadMutation.mutate(uploadForm);
  };
  
  // Handle upload review submission
  const handleReviewUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUpload) {
      updateUploadStatusMutation.mutate({
        id: selectedUpload.id,
        status: reviewForm.status,
        notes: reviewForm.notes,
      });
    }
  };
  
  // Handle copy movie from Google Drive
  const handleCopyDriveMovies = (e: React.FormEvent) => {
    e.preventDefault();
    copyDriveMoviesMutation.mutate({
      sourceFolderId: copyForm.sourceFolderId,
      destinationFolderId: copyForm.destinationFolderId
    });
  };
  
  // Handle Google Drive import dialog open
  const openImportFromDrive = () => {
    setDriveFiles([]);
    setSelectedDriveFiles([]);
    setIsLoadingDriveFiles(true);
    setOpenImportDialog(true);
    fetchDriveFilesMutation.mutate(driveFolderId);
  };
  
  // Handle Drive folder ID change
  const handleDriveFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDriveFolderId(e.target.value);
  };
  
  // Handle fetching files from a Google Drive folder
  const handleFetchDriveFiles = () => {
    setIsLoadingDriveFiles(true);
    fetchDriveFilesMutation.mutate(driveFolderId);
  };
  
  // Toggle selection of a Drive file
  const toggleFileSelection = (file: any) => {
    // Check if file is already selected
    const isSelected = selectedDriveFiles.some(selected => selected.id === file.id);
    
    if (isSelected) {
      // Remove from selection
      setSelectedDriveFiles(selectedDriveFiles.filter(selected => selected.id !== file.id));
    } else {
      // Add to selection with default metadata
      const fileWithMetadata = {
        ...file,
        title: file.name.replace(/\.\w+$/, ''), // Remove file extension
        description: '',
        releaseYear: new Date().getFullYear(),
        duration: 90,
        rating: 'PG-13',
        posterUrl: file.thumbnailLink || 'https://via.placeholder.com/300x450?text=No+Poster',
        backdropUrl: 'https://via.placeholder.com/1280x720?text=No+Backdrop',
        videoUrl: file.webContentLink || file.id,
        videoSources: [
          {
            quality: 'HD',
            url: file.webContentLink || file.id
          }
        ],
        genreIds: [1] // Default to first genre
      };
      
      setSelectedDriveFiles([...selectedDriveFiles, fileWithMetadata]);
    }
  };
  
  // Update metadata for a selected file
  const updateFileMetadata = (fileId: string, field: string, value: any) => {
    setSelectedDriveFiles(selectedDriveFiles.map(file => {
      if (file.id === fileId) {
        return { ...file, [field]: value };
      }
      return file;
    }));
  };
  
  // Import selected Drive files as movies
  const handleImportDriveMovies = () => {
    if (selectedDriveFiles.length === 0) {
      toast({
        title: t('admin.error'),
        description: t('admin.noFilesSelected'),
        variant: 'destructive',
      });
      return;
    }
    
    importDriveMoviesMutation.mutate(selectedDriveFiles);
  };
  
  // Handle adding movie from URL
  const handleAddMovieFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!urlForm.title || !urlForm.videoUrl) {
      toast({
        title: t('admin.error'),
        description: 'Title and video URL are required',
        variant: 'destructive',
      });
      return;
    }
    
    // Create a movie with the video sources from the URL
    const movie = {
      ...urlForm,
      videoSources: [
        {
          quality: 'HD',
          url: urlForm.videoUrl
        }
      ]
    };
    
    // Call the create movie mutation
    createMovieMutation.mutate(movie);
  };
  
  return (
    <div className="space-y-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="movies">
            <Film className="h-4 w-4 mr-2" />
            {t('admin.movies')}
          </TabsTrigger>
          <TabsTrigger value="uploads">
            <FileVideo className="h-4 w-4 mr-2" />
            {t('admin.movieUploads')}
            {pendingUploads.length > 0 && (
              <span className="ml-2 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-xs">
                {pendingUploads.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        {/* Movies Tab Content */}
        <TabsContent value="movies" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{t('admin.movieManagement')}</h2>
              {sortField === 'manual' && (
                <div className="px-2 py-1 rounded-md text-xs bg-amber-100 text-amber-800 flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  {t('admin.manualOrderActive') || 'Manual order active'}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={openImportFromDrive}>
                <FileVideo className="mr-2 h-4 w-4" />
                {t('admin.importFromDrive') || 'Import From Drive'}
              </Button>
              <Button variant="outline" onClick={() => setOpenCopyDialog(true)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('admin.copyFromDrive')}
              </Button>
              <Button variant="outline" onClick={() => {
                // Reset URL form first
                setUrlForm(defaultUrlForm);
                setOpenAddUrlDialog(true);
              }}>
                <Link className="mr-2 h-4 w-4" />
                {t('admin.addFromUrl')}
              </Button>
              <Button onClick={() => setOpenCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('admin.addMovie')}
              </Button>
            </div>
          </div>
          
          {/* Movies Table */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>{t('admin.moviesListCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('id')} className="cursor-pointer hover:bg-muted">
                    <div className="flex items-center">
                      {t('admin.id')}
                      {sortField === 'id' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('title')} className="cursor-pointer hover:bg-muted">
                    <div className="flex items-center">
                      {t('admin.title')}
                      {sortField === 'title' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('releaseYear')} className="cursor-pointer hover:bg-muted">
                    <div className="flex items-center">
                      {t('admin.releaseYear')}
                      {sortField === 'releaseYear' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('duration')} className="cursor-pointer hover:bg-muted">
                    <div className="flex items-center">
                      {t('admin.duration')}
                      {sortField === 'duration' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('rating')} className="cursor-pointer hover:bg-muted">
                    <div className="flex items-center">
                      {t('admin.rating')}
                      {sortField === 'rating' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead onClick={() => handleSort('viewCount')} className="cursor-pointer hover:bg-muted">
                    <div className="flex items-center">
                      {t('admin.views')}
                      {sortField === 'viewCount' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingMovies ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : movies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      {t('admin.noMoviesFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedMovies.map((movie) => (
                    <TableRow key={movie.id}>
                      <TableCell>{movie.id}</TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <div 
                            className="h-10 w-16 rounded mr-2 bg-cover bg-center"
                            style={{ backgroundImage: `url(${movie.posterUrl})` }}
                          />
                          {movie.title}
                        </div>
                      </TableCell>
                      <TableCell>{movie.releaseYear}</TableCell>
                      <TableCell>{movie.duration} min</TableCell>
                      <TableCell>{movie.rating}</TableCell>
                      <TableCell>{movie.viewCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => moveMovieUp(movie.id)}
                            disabled={manualOrder.indexOf(movie.id) <= 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => moveMovieDown(movie.id)}
                            disabled={manualOrder.indexOf(movie.id) >= manualOrder.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(`/movie/${movie.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openMovieEdit(movie)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openMovieDelete(movie)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        {/* Uploads Tab Content */}
        <TabsContent value="uploads" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('admin.movieUploads')}</h2>
            <Button onClick={() => setOpenUploadDialog(true)}>
              <FileVideo className="mr-2 h-4 w-4" />
              {t('admin.submitUpload')}
            </Button>
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-amber-500" />
                  {t('admin.pendingUploads')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingUploads ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    pendingUploads.filter(upload => upload.status === 'pending').length
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                  {t('admin.approvedUploads')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingUploads ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    pendingUploads.filter(upload => upload.status === 'approved').length
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium flex items-center">
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  {t('admin.rejectedUploads')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoadingUploads ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    pendingUploads.filter(upload => upload.status === 'rejected').length
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Uploads Table */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>{t('admin.uploadsListCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.id')}</TableHead>
                  <TableHead>{t('admin.title')}</TableHead>
                  <TableHead>{t('admin.uploaderId')}</TableHead>
                  <TableHead>{t('admin.submittedAt')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingUploads ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : pendingUploads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {t('admin.noUploadsFound')}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingUploads.map((upload) => (
                    <TableRow key={upload.id}>
                      <TableCell>{upload.id}</TableCell>
                      <TableCell className="font-medium">{upload.title}</TableCell>
                      <TableCell>{upload.uploaderId}</TableCell>
                      <TableCell>{formatDate(upload.createdAt)}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          upload.status === 'approved' 
                            ? 'bg-green-100 text-green-800' 
                            : upload.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {upload.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => openUploadReview(upload)}
                            disabled={upload.status !== 'pending'}
                          >
                            {upload.status === 'pending' ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              upload.status === 'approved' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Create Movie Dialog */}
      <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.addNewMovie')}</DialogTitle>
            <DialogDescription>
              {t('admin.addMovieDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateMovie}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('admin.title')} *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={movieForm.title}
                    onChange={handleMovieInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="releaseYear">{t('admin.releaseYear')}</Label>
                    <Input
                      id="releaseYear"
                      name="releaseYear"
                      type="number"
                      value={movieForm.releaseYear}
                      onChange={handleMovieInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="duration">{t('admin.duration')} (min)</Label>
                    <Input
                      id="duration"
                      name="duration"
                      type="number"
                      value={movieForm.duration}
                      onChange={handleMovieInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">{t('admin.description')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={movieForm.description}
                  onChange={handleMovieInputChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="posterUrl">{t('admin.posterUrl')}</Label>
                  <Input
                    id="posterUrl"
                    name="posterUrl"
                    value={movieForm.posterUrl}
                    onChange={handleMovieInputChange}
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="backdropUrl">{t('admin.backdropUrl')}</Label>
                  <Input
                    id="backdropUrl"
                    name="backdropUrl"
                    value={movieForm.backdropUrl}
                    onChange={handleMovieInputChange}
                    placeholder="https://example.com/backdrop.jpg"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating">{t('admin.rating')}</Label>
                  <Select 
                    value={movieForm.rating} 
                    onValueChange={(value) => handleSelectChange('rating', value)}
                  >
                    <SelectTrigger id="rating">
                      <SelectValue placeholder={t('admin.selectRating')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="PG">PG</SelectItem>
                      <SelectItem value="PG-13">PG-13</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                      <SelectItem value="NC-17">NC-17</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="director">{t('admin.director')}</Label>
                  <Input
                    id="director"
                    name="director"
                    value={movieForm.director}
                    onChange={handleMovieInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cast">{t('admin.cast')} ({t('admin.commaSeparated')})</Label>
                <Input
                  id="cast"
                  name="cast"
                  value={movieForm.cast.join(', ')}
                  onChange={(e) => handleCastChange(e.target.value)}
                  placeholder="Actor 1, Actor 2, Actor 3"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetMovieForm}
                >
                  {t('admin.cancel')}
                </Button>
              </DialogClose>
              <Button 
                type="submit"
                disabled={createMovieMutation.isPending}
              >
                {createMovieMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('admin.createMovie')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Movie Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.editMovie')}</DialogTitle>
            <DialogDescription>
              {t('admin.editMovieDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateMovie}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">{t('admin.title')} *</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    value={movieForm.title}
                    onChange={handleMovieInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-releaseYear">{t('admin.releaseYear')}</Label>
                    <Input
                      id="edit-releaseYear"
                      name="releaseYear"
                      type="number"
                      value={movieForm.releaseYear}
                      onChange={handleMovieInputChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">{t('admin.duration')} (min)</Label>
                    <Input
                      id="edit-duration"
                      name="duration"
                      type="number"
                      value={movieForm.duration}
                      onChange={handleMovieInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-description">{t('admin.description')}</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  rows={3}
                  value={movieForm.description}
                  onChange={handleMovieInputChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-posterUrl">{t('admin.posterUrl')}</Label>
                  <Input
                    id="edit-posterUrl"
                    name="posterUrl"
                    value={movieForm.posterUrl}
                    onChange={handleMovieInputChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-backdropUrl">{t('admin.backdropUrl')}</Label>
                  <Input
                    id="edit-backdropUrl"
                    name="backdropUrl"
                    value={movieForm.backdropUrl}
                    onChange={handleMovieInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-videoUrl">{t('admin.videoUrl')}</Label>
                <Input
                  id="edit-videoUrl"
                  name="videoUrl"
                  value={movieForm.videoUrl}
                  onChange={handleMovieInputChange}
                  placeholder="https://drive.google.com/file/d/FILE_ID/view"
                />
                <p className="text-xs text-muted-foreground">
                  Google Drive link, direct video URL, or Drive file ID
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rating">{t('admin.rating')}</Label>
                  <Select 
                    value={movieForm.rating} 
                    onValueChange={(value) => handleSelectChange('rating', value)}
                  >
                    <SelectTrigger id="edit-rating">
                      <SelectValue placeholder={t('admin.selectRating')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="PG">PG</SelectItem>
                      <SelectItem value="PG-13">PG-13</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                      <SelectItem value="NC-17">NC-17</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-director">{t('admin.director')}</Label>
                  <Input
                    id="edit-director"
                    name="director"
                    value={movieForm.director}
                    onChange={handleMovieInputChange}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-cast">{t('admin.cast')} ({t('admin.commaSeparated')})</Label>
                <Input
                  id="edit-cast"
                  name="cast"
                  value={movieForm.cast.join(', ')}
                  onChange={(e) => handleCastChange(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline"
                >
                  {t('admin.cancel')}
                </Button>
              </DialogClose>
              <Button 
                type="submit"
                disabled={updateMovieMutation.isPending}
              >
                {updateMovieMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('admin.updateMovie')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Movie Dialog */}
      <Dialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.deleteMovie')}</DialogTitle>
            <DialogDescription>
              {t('admin.deleteMovieConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedMovie && (
              <p className="font-medium">
                {selectedMovie.title} ({selectedMovie.releaseYear})
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button 
                type="button" 
                variant="outline"
              >
                {t('admin.cancel')}
              </Button>
            </DialogClose>
            <Button 
              variant="destructive"
              onClick={handleDeleteMovie}
              disabled={deleteMovieMutation.isPending}
            >
              {deleteMovieMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('admin.confirmDelete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upload Movie Dialog */}
      <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.submitMovieUpload')}</DialogTitle>
            <DialogDescription>
              {t('admin.submitUploadDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitUpload}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="upload-title">{t('admin.title')} *</Label>
                <Input
                  id="upload-title"
                  name="title"
                  value={uploadForm.title}
                  onChange={handleUploadInputChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="upload-description">{t('admin.description')}</Label>
                <Textarea
                  id="upload-description"
                  name="description"
                  rows={3}
                  value={uploadForm.description}
                  onChange={handleUploadInputChange}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="upload-videoUrl">{t('admin.videoUrl')} *</Label>
                <Input
                  id="upload-videoUrl"
                  name="videoUrl"
                  value={uploadForm.videoUrl}
                  onChange={handleUploadInputChange}
                  placeholder="https://example.com/video.mp4"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="upload-notes">{t('admin.submissionNotes')}</Label>
                <Textarea
                  id="upload-notes"
                  name="submissionNotes"
                  rows={2}
                  value={uploadForm.submissionNotes}
                  onChange={handleUploadInputChange}
                  placeholder={t('admin.notesPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetUploadForm}
                >
                  {t('admin.cancel')}
                </Button>
              </DialogClose>
              <Button 
                type="submit"
                disabled={createUploadMutation.isPending}
              >
                {createUploadMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('admin.submitUpload')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Review Upload Dialog */}
      <Dialog open={openReviewDialog} onOpenChange={setOpenReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.reviewUpload')}</DialogTitle>
            <DialogDescription>
              {t('admin.reviewUploadDescription')}
            </DialogDescription>
          </DialogHeader>
          {selectedUpload && (
            <form onSubmit={handleReviewUpload}>
              <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t('admin.title')}</Label>
                  <p>{selectedUpload.title}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t('admin.description')}</Label>
                  <p className="text-sm">{selectedUpload.description || t('admin.noDescription')}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t('admin.videoUrl')}</Label>
                  <p className="text-sm break-all">{selectedUpload.videoUrl}</p>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-sm font-medium">{t('admin.submissionNotes')}</Label>
                  <p className="text-sm">{selectedUpload.submissionNotes || t('admin.noNotes')}</p>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="review-status">{t('admin.reviewDecision')} *</Label>
                  <Select 
                    value={reviewForm.status} 
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger id="review-status">
                      <SelectValue placeholder={t('admin.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">{t('admin.approve')}</SelectItem>
                      <SelectItem value="rejected">{t('admin.reject')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="review-notes">{t('admin.reviewNotes')}</Label>
                  <Textarea
                    id="review-notes"
                    name="notes"
                    rows={3}
                    value={reviewForm.notes}
                    onChange={handleReviewInputChange}
                    placeholder={t('admin.reviewNotesPlaceholder')}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button 
                    type="button" 
                    variant="outline"
                  >
                    {t('admin.cancel')}
                  </Button>
                </DialogClose>
                <Button 
                  type="submit"
                  disabled={updateUploadStatusMutation.isPending}
                  variant={reviewForm.status === 'approved' ? 'default' : 'destructive'}
                >
                  {updateUploadStatusMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {reviewForm.status === 'approved' 
                    ? t('admin.approveUpload') 
                    : t('admin.rejectUpload')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Google Drive Import Dialog */}
      <Dialog open={openImportDialog} onOpenChange={setOpenImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('admin.importFromDrive') || 'Import Movies from Google Drive'}</DialogTitle>
            <DialogDescription>
              Select movies from your Google Drive to import into FilmFlex.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Drive folder selector */}
            <div className="flex gap-2 items-center">
              <Label htmlFor="driveFolderId" className="w-auto whitespace-nowrap">Drive Folder ID:</Label>
              <Input 
                id="driveFolderId" 
                className="flex-1"
                value={driveFolderId} 
                onChange={handleDriveFolderChange}
                placeholder="1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN" 
              />
              <Button onClick={handleFetchDriveFiles} disabled={isLoadingDriveFiles}>
                {isLoadingDriveFiles ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileVideo className="h-4 w-4 mr-2" />
                )}
                Fetch Files
              </Button>
            </div>
            
            {/* File selection area */}
            <div className="border rounded-md p-2 min-h-[200px]">
              {isLoadingDriveFiles ? (
                <div className="h-48 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin mr-2" />
                  <span>Loading files from Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  <p>No files found. Please check the folder ID and try again.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="grid grid-cols-[auto_1fr_80px_80px] gap-2 py-2 px-3 bg-muted font-medium text-sm">
                    <div></div>
                    <div>Filename</div>
                    <div>Type</div>
                    <div>Size</div>
                  </div>
                  
                  {driveFiles.map(file => {
                    const isSelected = selectedDriveFiles.some(f => f.id === file.id);
                    const isVideo = file.mimeType?.includes('video') || 
                                   /\.(mp4|webm|mkv|avi|mov)$/i.test(file.name);
                    
                    if (!isVideo) return null;
                    
                    return (
                      <div 
                        key={file.id}
                        className={`grid grid-cols-[auto_1fr_80px_80px] gap-2 items-center py-2 px-3 rounded hover:bg-muted cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`}
                        onClick={() => toggleFileSelection(file)}
                      >
                        <div>
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-muted-foreground" />
                          )}
                        </div>
                        <div className="font-medium truncate">{file.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {file.mimeType?.replace('video/', '') || 'Video'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {file.size ? `${Math.round(parseInt(file.size) / (1024 * 1024))} MB` : 'N/A'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Selected files preview */}
            {selectedDriveFiles.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Selected Files ({selectedDriveFiles.length})</h3>
                <div className="space-y-4">
                  {selectedDriveFiles.map(file => (
                    <div key={file.id} className="border rounded-md p-3 space-y-3">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-primary">{file.name}</h4>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFileSelection(file);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`title-${file.id}`}>Title</Label>
                          <Input 
                            id={`title-${file.id}`}
                            value={file.title || ''}
                            onChange={(e) => updateFileMetadata(file.id, 'title', e.target.value)}
                            placeholder="Movie title"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`releaseYear-${file.id}`}>Release Year</Label>
                          <Input 
                            id={`releaseYear-${file.id}`}
                            type="number"
                            value={file.releaseYear || new Date().getFullYear()}
                            onChange={(e) => updateFileMetadata(file.id, 'releaseYear', parseInt(e.target.value))}
                            placeholder="Release year"
                          />
                        </div>
                        
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor={`description-${file.id}`}>Description</Label>
                          <Textarea 
                            id={`description-${file.id}`}
                            value={file.description || ''}
                            onChange={(e) => updateFileMetadata(file.id, 'description', e.target.value)}
                            placeholder="Movie description"
                            rows={2}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`duration-${file.id}`}>Duration (minutes)</Label>
                          <Input 
                            id={`duration-${file.id}`}
                            type="number"
                            value={file.duration || 90}
                            onChange={(e) => updateFileMetadata(file.id, 'duration', parseInt(e.target.value))}
                            placeholder="Duration"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`rating-${file.id}`}>Rating</Label>
                          <Select 
                            value={file.rating || 'PG-13'} 
                            onValueChange={(value) => updateFileMetadata(file.id, 'rating', value)}
                          >
                            <SelectTrigger id={`rating-${file.id}`}>
                              <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="G">G</SelectItem>
                              <SelectItem value="PG">PG</SelectItem>
                              <SelectItem value="PG-13">PG-13</SelectItem>
                              <SelectItem value="R">R</SelectItem>
                              <SelectItem value="NC-17">NC-17</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenImportDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImportDriveMovies}
              disabled={selectedDriveFiles.length === 0 || importDriveMoviesMutation.isPending}
            >
              {importDriveMoviesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FileVideo className="h-4 w-4 mr-2" />
              )}
              Import {selectedDriveFiles.length} Movies
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Copy from Google Drive Dialog */}
      <Dialog open={openCopyDialog} onOpenChange={setOpenCopyDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t('admin.copyFromDrive')}</DialogTitle>
            <DialogDescription>
              <span className="text-yellow-600 font-medium">⚠️ Note: Direct Drive API access requires OAuth authentication.</span> Please use the "Add from URL" method as described below.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 mb-6 border-l-4 border-blue-500 bg-blue-50 p-4 rounded-sm">
            <h4 className="font-medium mb-2">Using the URL Method (Recommended)</h4>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Open your Google Drive folder directly in a browser</li>
              <li>Click on each video file you want to add</li>
              <li>Click the "More actions" menu (three dots) and select "Get link"</li>
              <li>Copy the link and use it in the "Add from URL" feature</li>
              <li>Add each video one by one with proper metadata</li>
            </ol>
            <Button 
              className="mt-4" 
              onClick={() => {
                setOpenCopyDialog(false);
                setTimeout(() => {
                  setUrlForm(defaultUrlForm);
                  setOpenAddUrlDialog(true);
                }, 100);
              }}
            >
              <Link className="mr-2 h-4 w-4" />
              Use Add from URL Instead
            </Button>
          </div>
          <form onSubmit={handleCopyDriveMovies}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sourceFolderId">{t('admin.sourceFolderId')} *</Label>
                <Input
                  id="sourceFolderId"
                  name="sourceFolderId"
                  value={copyForm.sourceFolderId}
                  onChange={handleCopyInputChange}
                  placeholder="1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Extract from URL: https://drive.google.com/drive/folders/1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destinationFolderId">{t('admin.destinationFolderId')} *</Label>
                <Input
                  id="destinationFolderId"
                  name="destinationFolderId"
                  value={copyForm.destinationFolderId}
                  onChange={handleCopyInputChange}
                  placeholder="10e9ynLaJdenTOQzuq3E9eoBM6JL5LDEF"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Extract from URL: https://drive.google.com/drive/folders/10e9ynLaJdenTOQzuq3E9eoBM6JL5LDEF
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('admin.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={copyDriveMoviesMutation.isPending}>
                {copyDriveMoviesMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                <Info className="mr-2 h-4 w-4" />
                Get Instructions
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Add Movie from URL Dialog */}
      <Dialog open={openAddUrlDialog} onOpenChange={setOpenAddUrlDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('admin.addFromUrl')}</DialogTitle>
            <DialogDescription>
              {t('admin.addMovieDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMovieFromUrl}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="url-title">{t('admin.title')} *</Label>
                  <Input
                    id="url-title"
                    name="title"
                    value={urlForm.title}
                    onChange={handleUrlInputChange}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="url-releaseYear">{t('admin.releaseYear')}</Label>
                    <Input
                      id="url-releaseYear"
                      name="releaseYear"
                      type="number"
                      value={urlForm.releaseYear}
                      onChange={handleUrlInputChange}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="url-duration">{t('admin.duration')} (min)</Label>
                    <Input
                      id="url-duration"
                      name="duration"
                      type="number"
                      value={urlForm.duration}
                      onChange={handleUrlInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="url-description">{t('admin.description')}</Label>
                  <Textarea
                    id="url-description"
                    name="description"
                    value={urlForm.description}
                    onChange={handleUrlInputChange}
                    className="h-20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="url-posterUrl">{t('admin.posterUrl')}</Label>
                  <Input
                    id="url-posterUrl"
                    name="posterUrl"
                    value={urlForm.posterUrl}
                    onChange={handleUrlInputChange}
                    placeholder="https://example.com/poster.jpg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="url-backdropUrl">{t('admin.backdropUrl')}</Label>
                  <Input
                    id="url-backdropUrl"
                    name="backdropUrl"
                    value={urlForm.backdropUrl}
                    onChange={handleUrlInputChange}
                    placeholder="https://example.com/backdrop.jpg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="url-rating">{t('admin.rating')}</Label>
                  <Select 
                    name="rating" 
                    value={urlForm.rating}
                    onValueChange={(value) => setUrlForm({ ...urlForm, rating: value })}
                  >
                    <SelectTrigger id="url-rating">
                      <SelectValue placeholder={t('admin.selectRating')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="G">G</SelectItem>
                      <SelectItem value="PG">PG</SelectItem>
                      <SelectItem value="PG-13">PG-13</SelectItem>
                      <SelectItem value="R">R</SelectItem>
                      <SelectItem value="NC-17">NC-17</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="url-director">{t('admin.director')}</Label>
                  <Input
                    id="url-director"
                    name="director"
                    value={urlForm.director}
                    onChange={handleUrlInputChange}
                  />
                </div>
                
                <div className="space-y-2 col-span-full">
                  <Label htmlFor="url-videoUrl">{t('admin.videoUrl')} *</Label>
                  <Input
                    id="url-videoUrl"
                    name="videoUrl"
                    value={urlForm.videoUrl}
                    onChange={handleUrlInputChange}
                    placeholder="https://example.com/video.mp4"
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="button">
                  {t('admin.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={createMovieMutation.isPending}>
                {createMovieMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('admin.creating')}
                  </>
                ) : (
                  t('admin.createMovie')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}