import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Eye, Pencil, Trash2 } from "lucide-react";

export default function MovieManagement() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('movies');
  const [openNewMovieDialog, setOpenNewMovieDialog] = useState(false);
  const [openEditMovieDialog, setOpenEditMovieDialog] = useState(false);
  const [openDeleteConfirmDialog, setOpenDeleteConfirmDialog] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [selectedUpload, setSelectedUpload] = useState<MovieUpload | null>(null);
  
  // Form state for new/edit movie
  const [movieData, setMovieData] = useState({
    title: '',
    description: '',
    releaseYear: new Date().getFullYear(),
    duration: 120,
    posterUrl: '',
    backdropUrl: '',
    rating: 'PG-13',
    genreIds: [1], // Default to Action
    director: '',
    cast: [] as string[],
    imdbRating: '',
    videoSources: [] as { quality: string, url: string }[]
  });
  
  // Form state for movie upload review
  const [reviewData, setReviewData] = useState({
    status: 'pending_review',
    notes: ''
  });
  
  // Fetch movies
  const { data: movies = [], isLoading: isMoviesLoading } = useQuery<Movie[]>({
    queryKey: ['/api/movies'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/movies');
      return res.json();
    },
  });
  
  // Fetch pending uploads
  const { data: pendingUploads = [], isLoading: isUploadsLoading } = useQuery<MovieUpload[]>({
    queryKey: ['/api/admin/movie-uploads'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/movie-uploads');
      return res.json();
    },
  });
  
  // Create new movie
  const createMovieMutation = useMutation({
    mutationFn: async (movieData: any) => {
      const res = await apiRequest('POST', '/api/admin/movies', movieData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieCreated'),
        description: t('admin.movieCreatedSuccess'),
      });
      setOpenNewMovieDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.movieCreateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Update movie
  const updateMovieMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest('PATCH', `/api/admin/movies/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieUpdated'),
        description: t('admin.movieUpdatedSuccess'),
      });
      setOpenEditMovieDialog(false);
      setSelectedMovie(null);
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.movieUpdateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Delete movie
  const deleteMovieMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/admin/movies/${id}`);
    },
    onSuccess: () => {
      toast({
        title: t('admin.movieDeleted'),
        description: t('admin.movieDeletedSuccess'),
      });
      setOpenDeleteConfirmDialog(false);
      setSelectedMovie(null);
      queryClient.invalidateQueries({ queryKey: ['/api/movies'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.movieDeleteFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Update upload status
  const updateUploadStatusMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest('PATCH', `/api/admin/movie-uploads/${id}/status`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('admin.uploadStatusUpdated'),
        description: t('admin.uploadStatusUpdatedSuccess'),
      });
      setOpenReviewDialog(false);
      setSelectedUpload(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/movie-uploads'] });
    },
    onError: (error: any) => {
      toast({
        title: t('admin.error'),
        description: error.message || t('admin.uploadStatusUpdateFailed'),
        variant: 'destructive',
      });
    },
  });
  
  // Handle movie form input changes
  const handleMovieInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setMovieData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle number input changes
  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setMovieData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };
  
  // Handle select changes
  const handleSelectChange = (name: string, value: string | string[]) => {
    setMovieData(prev => ({ ...prev, [name]: value }));
  };
  
  // Open edit dialog and initialize with movie data
  const openEditMovie = (movie: Movie) => {
    setSelectedMovie(movie);
    setMovieData({
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
      imdbRating: movie.imdbRating || '',
      videoSources: movie.videoSources as any || []
    });
    setOpenEditMovieDialog(true);
  };
  
  // Open delete confirmation dialog
  const openDeleteConfirm = (movie: Movie) => {
    setSelectedMovie(movie);
    setOpenDeleteConfirmDialog(true);
  };
  
  // Open review dialog for upload
  const openReviewUpload = (upload: MovieUpload) => {
    setSelectedUpload(upload);
    setReviewData({
      status: upload.status,
      notes: upload.reviewNotes || ''
    });
    setOpenReviewDialog(true);
  };
  
  // Handle create movie form submission
  const handleCreateMovie = (e: React.FormEvent) => {
    e.preventDefault();
    createMovieMutation.mutate(movieData);
  };
  
  // Handle update movie form submission
  const handleUpdateMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMovie) {
      updateMovieMutation.mutate({ id: selectedMovie.id, data: movieData });
    }
  };
  
  // Handle delete movie confirmation
  const handleDeleteMovie = () => {
    if (selectedMovie) {
      deleteMovieMutation.mutate(selectedMovie.id);
    }
  };
  
  // Handle review upload submission
  const handleReviewUpload = () => {
    if (selectedUpload) {
      updateUploadStatusMutation.mutate({
        id: selectedUpload.id,
        data: reviewData
      });
    }
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="movies">{t('admin.allMovies')}</TabsTrigger>
          <TabsTrigger value="uploads">{t('admin.pendingUploads')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="movies" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('admin.movieManagement')}</h2>
            
            {/* New Movie Dialog */}
            <Dialog open={openNewMovieDialog} onOpenChange={setOpenNewMovieDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('admin.addMovie')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('admin.createNewMovie')}</DialogTitle>
                  <DialogDescription>
                    {t('admin.createMovieDescription')}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleCreateMovie} className="space-y-4 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">{t('admin.movieTitle')}</Label>
                      <Input
                        id="title"
                        name="title"
                        value={movieData.title}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.movieTitlePlaceholder')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="releaseYear">{t('admin.releaseYear')}</Label>
                      <Input
                        id="releaseYear"
                        name="releaseYear"
                        type="number"
                        value={movieData.releaseYear}
                        onChange={handleNumberInputChange}
                        min={1900}
                        max={new Date().getFullYear() + 5}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">{t('admin.description')}</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={movieData.description}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.descriptionPlaceholder')}
                        rows={3}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="duration">{t('admin.duration')}</Label>
                      <Input
                        id="duration"
                        name="duration"
                        type="number"
                        value={movieData.duration}
                        onChange={handleNumberInputChange}
                        min={1}
                        placeholder={t('admin.durationPlaceholder')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="rating">{t('admin.rating')}</Label>
                      <Select 
                        value={movieData.rating} 
                        onValueChange={(value) => handleSelectChange('rating', value)}
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="posterUrl">{t('admin.posterUrl')}</Label>
                      <Input
                        id="posterUrl"
                        name="posterUrl"
                        value={movieData.posterUrl}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.posterUrlPlaceholder')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="backdropUrl">{t('admin.backdropUrl')}</Label>
                      <Input
                        id="backdropUrl"
                        name="backdropUrl"
                        value={movieData.backdropUrl}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.backdropUrlPlaceholder')}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="director">{t('admin.director')}</Label>
                      <Input
                        id="director"
                        name="director"
                        value={movieData.director}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.directorPlaceholder')}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="imdbRating">{t('admin.imdbRating')}</Label>
                      <Input
                        id="imdbRating"
                        name="imdbRating"
                        value={movieData.imdbRating}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.imdbRatingPlaceholder')}
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setOpenNewMovieDialog(false)}>
                      {t('general.cancel')}
                    </Button>
                    <Button type="submit" disabled={createMovieMutation.isPending}>
                      {createMovieMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('admin.createMovie')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Edit Movie Dialog - Similar to create but with update functionality */}
            <Dialog open={openEditMovieDialog} onOpenChange={setOpenEditMovieDialog}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('admin.editMovie')}</DialogTitle>
                  <DialogDescription>
                    {t('admin.editMovieDescription')}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleUpdateMovie} className="space-y-4 py-4">
                  {/* Same form fields as create, but pre-filled with selected movie data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">{t('admin.movieTitle')}</Label>
                      <Input
                        id="edit-title"
                        name="title"
                        value={movieData.title}
                        onChange={handleMovieInputChange}
                        placeholder={t('admin.movieTitlePlaceholder')}
                        required
                      />
                    </div>
                    
                    {/* Other fields similar to create form */}
                    {/* ... */}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" type="button" onClick={() => setOpenEditMovieDialog(false)}>
                      {t('general.cancel')}
                    </Button>
                    <Button type="submit" disabled={updateMovieMutation.isPending}>
                      {updateMovieMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('admin.updateMovie')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            
            {/* Delete Confirmation Dialog */}
            <Dialog open={openDeleteConfirmDialog} onOpenChange={setOpenDeleteConfirmDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('admin.confirmDelete')}</DialogTitle>
                  <DialogDescription>
                    {t('admin.deleteMovieWarning')}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <p className="font-medium">{selectedMovie?.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{t('admin.thisActionCannot')}</p>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpenDeleteConfirmDialog(false)}>
                    {t('general.cancel')}
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteMovie} disabled={deleteMovieMutation.isPending}>
                    {deleteMovieMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('admin.deleteMovie')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Movies Table */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>{t('admin.movieListCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.movieId')}</TableHead>
                  <TableHead>{t('admin.movieTitle')}</TableHead>
                  <TableHead>{t('admin.releaseYear')}</TableHead>
                  <TableHead>{t('admin.duration')}</TableHead>
                  <TableHead>{t('admin.rating')}</TableHead>
                  <TableHead>{t('admin.views')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isMoviesLoading ? (
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
                      <TableCell>{movie.title}</TableCell>
                      <TableCell>{movie.releaseYear}</TableCell>
                      <TableCell>{movie.duration} min</TableCell>
                      <TableCell>{movie.rating}</TableCell>
                      <TableCell>{movie.viewCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => window.open(`/movie/${movie.id}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openEditMovie(movie)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => openDeleteConfirm(movie)}
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
        
        <TabsContent value="uploads" className="space-y-4">
          {/* Content for pending uploads tab */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{t('admin.pendingUploads')}</h2>
          </div>
          
          {/* Pending Uploads Table */}
          <div className="rounded-md border">
            <Table>
              <TableCaption>{t('admin.pendingUploadsCaption')}</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.uploadId')}</TableHead>
                  <TableHead>{t('admin.movieId')}</TableHead>
                  <TableHead>{t('admin.uploader')}</TableHead>
                  <TableHead>{t('admin.uploadDate')}</TableHead>
                  <TableHead>{t('admin.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isUploadsLoading ? (
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
                      <TableCell>{upload.movieId}</TableCell>
                      <TableCell>{upload.uploadedBy}</TableCell>
                      <TableCell>{new Date(upload.uploadedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          upload.status === 'published' 
                            ? 'bg-green-100 text-green-800'
                            : upload.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : upload.status === 'pending_review'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {upload.status === 'published' 
                            ? t('admin.published') 
                            : upload.status === 'rejected'
                            ? t('admin.rejected')
                            : upload.status === 'pending_review'
                            ? t('admin.pendingReview')
                            : t('admin.draft')
                          }
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => openReviewUpload(upload)}
                          >
                            {t('admin.review')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Review Upload Dialog */}
          <Dialog open={openReviewDialog} onOpenChange={setOpenReviewDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.reviewUpload')}</DialogTitle>
                <DialogDescription>
                  {t('admin.reviewUploadDescription')}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="upload-id">{t('admin.uploadId')}</Label>
                  <Input
                    id="upload-id"
                    value={selectedUpload?.id || ''}
                    readOnly
                    disabled
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="upload-status">{t('admin.status')}</Label>
                  <Select 
                    value={reviewData.status} 
                    onValueChange={(value) => setReviewData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('admin.selectStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_review">{t('admin.pendingReview')}</SelectItem>
                      <SelectItem value="published">{t('admin.publish')}</SelectItem>
                      <SelectItem value="rejected">{t('admin.reject')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="review-notes">{t('admin.reviewNotes')}</Label>
                  <Textarea
                    id="review-notes"
                    value={reviewData.notes}
                    onChange={(e) => setReviewData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('admin.reviewNotesPlaceholder')}
                    rows={3}
                  />
                </div>
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setOpenReviewDialog(false)}>
                    {t('general.cancel')}
                  </Button>
                  <Button onClick={handleReviewUpload} disabled={updateUploadStatusMutation.isPending}>
                    {updateUploadStatusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('admin.updateStatus')}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}