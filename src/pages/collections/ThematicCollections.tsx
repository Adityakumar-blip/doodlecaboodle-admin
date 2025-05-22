
import { useState, useEffect } from "react";
import { getCollectionsByType } from "@/lib/firebaseService";
import { Collection } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus } from "lucide-react";

const ThematicCollectionsPage = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const thematicCollections = await getCollectionsByType("thematic");
        setCollections(thematicCollections);
      } catch (error) {
        console.error("Error fetching thematic collections:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []);

  return (
    <div className="container p-6 mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-artist-purple flex items-center gap-2">
            <FolderOpen className="h-8 w-8" />
            Thematic Collections
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your thematic artwork collections
          </p>
        </div>
        <Button className="bg-artist-purple hover:bg-artist-purple/90">
          <Plus className="mr-2 h-4 w-4" /> Add New Collection
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
      ) : collections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <Card key={collection.id} className="admin-card overflow-hidden">
              <div 
                className="h-40 bg-cover bg-center" 
                style={{ backgroundImage: `url(${collection.coverImageUrl})` }}
              ></div>
              <CardHeader>
                <CardTitle>{collection.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {collection.description}
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
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-xl font-medium">No thematic collections found</h3>
          <p className="text-muted-foreground mt-2">
            Create collections based on themes to organize your work
          </p>
          <Button className="mt-4 bg-artist-purple hover:bg-artist-purple/90">
            <Plus className="mr-2 h-4 w-4" /> Add First Collection
          </Button>
        </div>
      )}
    </div>
  );
};

export default ThematicCollectionsPage;
