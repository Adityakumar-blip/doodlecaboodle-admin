
import { useState, useEffect } from "react";
import { getArtworksByCategory } from "@/lib/firebaseService";
import { Artwork } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileImage, Plus } from "lucide-react";

const DigitalArtPage = () => {
  const [digitalArt, setDigitalArt] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDigitalArt = async () => {
      try {
        const artworks = await getArtworksByCategory("digital");
        setDigitalArt(artworks);
      } catch (error) {
        console.error("Error fetching digital art:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDigitalArt();
  }, []);

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-artist-purple flex items-center gap-2">
            <FileImage className="h-8 w-8" />
            Digital Art
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your digital artworks
          </p>
        </div>
        <Button className="bg-artist-purple hover:bg-artist-purple/90">
          <Plus className="mr-2 h-4 w-4" /> Add New Digital Art
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
      ) : digitalArt.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {digitalArt.map((art) => (
            <Card key={art.id} className="admin-card overflow-hidden">
              <div 
                className="h-40 bg-cover bg-center" 
                style={{ backgroundImage: `url(${art.imageUrl})` }}
              ></div>
              <CardHeader>
                <CardTitle>{art.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {art.description}
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
          <FileImage className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-xl font-medium">No digital artworks found</h3>
          <p className="text-muted-foreground mt-2">
            Start adding digital artworks to your collection
          </p>
          <Button className="mt-4 bg-artist-purple hover:bg-artist-purple/90">
            <Plus className="mr-2 h-4 w-4" /> Add First Digital Artwork
          </Button>
        </div>
      )}
    </div>
  );
};

export default DigitalArtPage;
