
import { useState, useEffect } from "react";
import { getArtworksByCategory } from "@/lib/firebaseService";
import { Artwork } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brush, Plus } from "lucide-react";

const SketchesPage = () => {
  const [sketches, setSketches] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchSketches = async () => {
      try {
        const artworks = await getArtworksByCategory("sketches");
        setSketches(artworks);
      } catch (error) {
        console.error("Error fetching sketches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSketches();
  }, []);

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-artist-purple flex items-center gap-2">
            <Brush className="h-8 w-8" />
            Sketches
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your sketch artworks
          </p>
        </div>
        <Button className="bg-artist-purple hover:bg-artist-purple/90">
          <Plus className="mr-2 h-4 w-4" /> Add New Sketch
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
      ) : sketches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sketches.map((sketch) => (
            <Card key={sketch.id} className="admin-card overflow-hidden">
              <div 
                className="h-40 bg-cover bg-center" 
                style={{ backgroundImage: `url(${sketch.imageUrl})` }}
              ></div>
              <CardHeader>
                <CardTitle>{sketch.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {sketch.description}
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm">Edit</Button>
                <Button variant="destructive" size="sm">Delete</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center p-12 border rounded-lg bg-muted/20">
          <Brush className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-xl font-medium">No sketches found</h3>
          <p className="text-muted-foreground mt-2">
            Start adding sketches to your collection
          </p>
          <Button className="mt-4 bg-artist-purple hover:bg-artist-purple/90">
            <Plus className="mr-2 h-4 w-4" /> Add First Sketch
          </Button>
        </div>
      )}
    </div>
  );
};

export default SketchesPage;
