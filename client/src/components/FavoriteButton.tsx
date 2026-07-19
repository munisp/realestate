import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

interface FavoriteButtonProps {
  propertyId: number;
  variant?: "default" | "icon";
  className?: string;
}

export function FavoriteButton({ propertyId, variant = "icon", className }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: favorites } = trpc.favorites.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const isFavorite = favorites?.some(f => f.propertyId === propertyId) || false;

  const addFavorite = trpc.favorites.add.useMutation({
    onMutate: async () => {
      // Optimistic update
      await utils.favorites.list.cancel();
      const previousFavorites = utils.favorites.list.getData();
      
      utils.favorites.list.setData(undefined, (old) => [
        ...(old || []),
        { id: Date.now(), propertyId, userId: 0, notes: null, createdAt: new Date(), property: null } as any,
      ]);

      return { previousFavorites };
    },
    onError: (_err, _variables, context) => {
      utils.favorites.list.setData(undefined, context?.previousFavorites);
      toast.error("Failed to add to favorites");
    },
    onSuccess: () => {
      toast.success("Added to favorites");
    },
    onSettled: () => {
      utils.favorites.list.invalidate();
    },
  });

  const removeFavorite = trpc.favorites.remove.useMutation({
    onMutate: async ({ propertyId }) => {
      // Optimistic update
      await utils.favorites.list.cancel();
      const previousFavorites = utils.favorites.list.getData();
      
      utils.favorites.list.setData(undefined, (old) =>
        old?.filter(f => f.propertyId !== propertyId) || []
      );

      return { previousFavorites };
    },
    onError: (_err, _variables, context) => {
      utils.favorites.list.setData(undefined, context?.previousFavorites);
      toast.error("Failed to remove from favorites");
    },
    onSuccess: () => {
      toast.success("Removed from favorites");
    },
    onSettled: () => {
      utils.favorites.list.invalidate();
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error("Please sign in to save favorites");
      window.location.href = getLoginUrl();
      return;
    }

    if (isFavorite) {
      removeFavorite.mutate({ propertyId });
    } else {
      addFavorite.mutate({ propertyId });
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="secondary"
        size="icon"
        className={className}
        onClick={handleClick}
        disabled={addFavorite.isPending || removeFavorite.isPending}
      >
        <Heart
          className={`h-4 w-4 transition-all ${
            isFavorite ? "fill-primary text-primary" : ""
          }`}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isFavorite ? "default" : "outline"}
      className={className}
      onClick={handleClick}
      disabled={addFavorite.isPending || removeFavorite.isPending}
    >
      <Heart
        className={`mr-2 h-4 w-4 ${isFavorite ? "fill-current" : ""}`}
      />
      {isFavorite ? "Saved" : "Save"}
    </Button>
  );
}
