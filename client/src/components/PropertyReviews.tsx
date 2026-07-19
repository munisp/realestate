import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Star, ThumbsUp, CheckCircle, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PhotoUpload } from "@/components/PhotoUpload";

interface PropertyReviewsProps {
  propertyId: number;
}

export function PropertyReviews({ propertyId }: PropertyReviewsProps) {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [review, setReview] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const { data: reviews, isLoading } = trpc.reviews.list.useQuery({ propertyId });
  const { data: stats } = trpc.reviews.stats.useQuery({ propertyId });

  const createReview = trpc.reviews.create.useMutation({
    onSuccess: () => {
      utils.reviews.list.invalidate({ propertyId });
      utils.reviews.stats.invalidate({ propertyId });
      setIsDialogOpen(false);
      resetForm();
      toast.success("Review submitted! It will be published after moderation.");
    },
    onError: () => {
      toast.error("Failed to submit review");
    },
  });

  const markHelpful = trpc.reviews.markHelpful.useMutation({
    onSuccess: () => {
      utils.reviews.list.invalidate({ propertyId });
      toast.success("Thank you for your feedback!");
    },
  });

  const resetForm = () => {
    setRating(0);
    setTitle("");
    setReview("");
    setPros("");
    setCons("");
    setPhotoFiles([]);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!review.trim()) {
      toast.error("Please write a review");
      return;
    }

    // Upload photos first if any
    let photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      try {
        const uploadPromises = photoFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("propertyId", propertyId.toString());

          const response = await fetch("/api/trpc/reviews.uploadPhoto", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) throw new Error("Upload failed");
          const data = await response.json();
          return data.result.data.json.url;
        });

        photoUrls = await Promise.all(uploadPromises);
      } catch (error) {
        toast.error("Failed to upload photos");
        return;
      }
    }

    createReview.mutate({
      propertyId,
      overallRating: rating * 20, // Convert 1-5 to 20-100
      title: title.trim() || undefined,
      review: review.trim(),
      pros: pros.trim() || undefined,
      cons: cons.trim() || undefined,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
    });
  };

  const renderStars = (rating: number, size: "sm" | "lg" = "sm") => {
    const stars = Math.round(rating / 20); // Convert 20-100 to 1-5
    const sizeClass = size === "lg" ? "h-5 w-5" : "h-4 w-4";
    
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClass} ${
              star <= stars ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderInteractiveStars = () => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hoverRating || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = stats?.averageRating || 0;
  const totalReviews = stats?.totalReviews || 0;
  const ratingDistribution = stats?.ratingDistribution || {};

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Reviews & Ratings</h2>
          {totalReviews > 0 ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {renderStars(averageRating, "lg")}
                <span className="text-2xl font-bold">{(averageRating / 20).toFixed(1)}</span>
                <span className="text-muted-foreground">({totalReviews} reviews)</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No reviews yet</p>
          )}
        </div>

        {isAuthenticated ? (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Write Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Write a Review</DialogTitle>
                <DialogDescription>
                  Share your experience with this property
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Overall Rating *</Label>
                  {renderInteractiveStars()}
                  {rating > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {["Poor", "Fair", "Good", "Very Good", "Excellent"][rating - 1]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Review Title</Label>
                  <Input
                    id="title"
                    placeholder="Sum up your experience"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="review">Your Review *</Label>
                  <Textarea
                    id="review"
                    placeholder="Tell others about your experience with this property..."
                    value={review}
                    onChange={(e) => setReview(e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pros">Pros (Optional)</Label>
                    <Textarea
                      id="pros"
                      placeholder="What did you like?"
                      value={pros}
                      onChange={(e) => setPros(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cons">Cons (Optional)</Label>
                    <Textarea
                      id="cons"
                      placeholder="What could be improved?"
                      value={cons}
                      onChange={(e) => setCons(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Photos (Optional)</Label>
                  <PhotoUpload
                    maxFiles={5}
                    maxSizeInMB={5}
                    onFilesChange={setPhotoFiles}
                  />
                  <p className="text-xs text-muted-foreground">
                    Add up to 5 photos to your review (max 5MB each)
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={createReview.isPending}>
                  {createReview.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <Button asChild>
            <a href={getLoginUrl()}>Sign In to Review</a>
          </Button>
        )}
      </div>

      {/* Rating Distribution */}
      {totalReviews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = ratingDistribution[stars] || 0;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

              return (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-20">
                    <span className="text-sm font-medium">{stars}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  </div>
                  <Progress value={percentage} className="flex-1" />
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </CardHeader>
                <CardContent>
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
              <p className="text-muted-foreground text-center">
                Be the first to share your experience with this property
              </p>
            </CardContent>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {review.reviewerName?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">
                          {review.reviewerName || "Anonymous"}
                        </CardTitle>
                        {review.verifiedPurchase === 1 && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {renderStars(review.overallRating)}
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                {review.title && (
                  <CardTitle className="text-lg mt-2">{review.title}</CardTitle>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">{review.review}</p>

                {(review.pros || review.cons) && (
                  <div className="grid md:grid-cols-2 gap-4 pt-2 border-t">
                    {review.pros && (
                      <div>
                        <h4 className="font-semibold text-green-700 mb-1">Pros</h4>
                        <p className="text-sm text-muted-foreground">{review.pros}</p>
                      </div>
                    )}
                    {review.cons && (
                      <div>
                        <h4 className="font-semibold text-red-700 mb-1">Cons</h4>
                        <p className="text-sm text-muted-foreground">{review.cons}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markHelpful.mutate({ reviewId: review.id })}
                    disabled={markHelpful.isPending}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    Helpful ({review.helpfulCount || 0})
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
