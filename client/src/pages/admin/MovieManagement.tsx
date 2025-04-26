import { useState } from 'react';
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
  
  // Selected items
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<MovieUpload | null>(null);
  
  // Form state
  const [movieForm, setMovieForm] = useState({
    title: '',
    description: '',
    releaseYear: new Date().getFullYear(),
    duration: 120,
    posterUrl: '',
    backdropUrl: '',
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
    sourceFolderId: '',
    destinationFolderId: '',
  });
  
  const [urlForm, setUrlForm] = useState({
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
  });
  
  // Fetch movies
  const { data: movies = [], isLoading: isLoadingMovies } = useQuery<Movie[]>({
    queryKey: ['/api/admin/movies'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/movies');
      return res.json();
    },
  });
  
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
      const res = await apiRequest('POST', '/api/movies', movie);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieCreated'),
        description: t('admin.movieCreatedSuccess'),
      });
      setOpenCreateDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movies'] });
      resetMovieForm();
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
      toast({
        title: t('admin.driveMoviesCopied'),
        description: t('admin.driveMoviesCopiedSuccess').replace('{count}', data.details.filter((d: any) => d.success).length.toString()),
      });
      setOpenCopyDialog(false);
      // Reset the form
      setCopyForm({
        sourceFolderId: '',
        destinationFolderId: '',
      });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.driveMoviesCopyFailed'),
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
  
  // Handle adding movie from URL
  const handleAddMovieFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
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
    
    // Close the dialog
    setOpenAddUrlDialog(false);
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
            <h2 className="text-2xl font-bold">{t('admin.movieManagement')}</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpenCopyDialog(true)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('admin.copyFromDrive')}
              </Button>
              <Button variant="outline" onClick={() => {
                // Reset URL form first
                setUrlForm({
                  title: '',
                  description: '',
                  releaseYear: new Date().getFullYear(),
                  duration: 120,
                  posterUrl: '',
                  backdropUrl: '',
                  rating: 'PG-13',
                  videoUrl: '',
                  genreIds: [],
                  director: '',
                });
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
                  <TableHead>{t('admin.id')}</TableHead>
                  <TableHead>{t('admin.title')}</TableHead>
                  <TableHead>{t('admin.releaseYear')}</TableHead>
                  <TableHead>{t('admin.duration')}</TableHead>
                  <TableHead>{t('admin.rating')}</TableHead>
                  <TableHead>{t('admin.views')}</TableHead>
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
                  movies.map((movie) => (
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
      
      {/* Copy from Google Drive Dialog */}
      <Dialog open={openCopyDialog} onOpenChange={setOpenCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.copyFromDrive')}</DialogTitle>
            <DialogDescription>
              {t('admin.copyFromDriveDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCopyDriveMovies}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="sourceFolderId">{t('admin.sourceFolderId')} *</Label>
                <Input
                  id="sourceFolderId"
                  name="sourceFolderId"
                  value={copyForm.sourceFolderId}
                  onChange={handleCopyInputChange}
                  placeholder="1AbCdEfGhIjKlMnOpQrStUv"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.sourceFolderIdHint')}
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="destinationFolderId">{t('admin.destinationFolderId')} *</Label>
                <Input
                  id="destinationFolderId"
                  name="destinationFolderId"
                  value={copyForm.destinationFolderId}
                  onChange={handleCopyInputChange}
                  placeholder="1AbCdEfGhIjKlMnOpQrStUv"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('admin.destinationFolderIdHint')}
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
                <Copy className="mr-2 h-4 w-4" />
                {t('admin.copyMovies')}
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