import { useState, useEffect } from "react";
import { getArtworksByCategory } from "@/lib/firebaseService";
import { Artwork } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, Plus } from "lucide-react";

const PaintingsPage = () => {
  const [paintings, setPaintings] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const artworks = await getArtworksByCategory("paintings");
        setPaintings([]);
      } catch (error) {
        console.error("Error fetching paintings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaintings();
  }, []);

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-artist-purple flex items-center gap-2">
            <Palette className="h-8 w-8" />
            Paintings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your painting artworks
          </p>
        </div>
        <Button className="bg-artist-purple hover:bg-artist-purple/90">
          <Plus className="mr-2 h-4 w-4" /> Add New Painting
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="admin-card">
              <div className="h-40 bg-muted animate-pulse rounded-t-lg"></div>
              <CardHeader>
                <div className="h-6 w-2/3 bg-muted animate-pulse rounded-md"></div>
                <div className="h-4 w-full bg-muted animate-pulse rounded-md mt-2"></div>
              </CardHeader>
              <CardFooter>
                <div className="h-10 w-full bg-muted animate-pulse rounded-md"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : paintings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paintings.map((painting) => (
            <Card key={painting.id} className="admin-card overflow-hidden">
              <div
                className="h-40 bg-cover bg-center"
                style={{ backgroundImage: `url(${painting.imageUrl})` }}
              ></div>
              <CardHeader>
                <CardTitle>{painting.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {painting.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border rounded-lg bg-muted/20">
          <Palette className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-xl font-medium">No paintings found</h3>
          <p className="text-muted-foreground mt-2">
            Start adding paintings to your collection
          </p>
          <Button className="mt-4 bg-artist-purple hover:bg-artist-purple/90">
            <Plus className="mr-2 h-4 w-4" /> Add First Painting
          </Button>
        </div>
      )}
    </div>
  );
};

export default PaintingsPage;
