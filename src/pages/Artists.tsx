import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { MasterDrawer } from "@/components/MasterDrawer";
import ArtistModal from "@/views/ArtistModal";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";

type Artist = {
  id: string;
  name: string;
  bio: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  socialLinks?: string[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};

export default function Artists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchArtists = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "artists"));
      const fetchedArtists = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Artist[];
      setArtists(fetchedArtists);
    } catch (error) {
      console.error("Error fetching artists:", error);
      toast.error("Failed to fetch artists");
    }
  };

  useEffect(() => {
    fetchArtists();
  }, []);

  const handleArtistAdded = (newArtist: Artist) => {
    setArtists((prev) => [...prev, newArtist]);
    setDrawerOpen(false);
  };

  const handleDeleteArtist = async (artistId: string) => {
    try {
      await deleteDoc(doc(db, "artists", artistId));
      setArtists((prev) => prev.filter((artist) => artist.id !== artistId));
      toast.success("Artist deleted successfully");
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Failed to delete artist");
    }
  };

  const columns: DataTableColumn<Artist>[] = [
    {
      id: "name",
      header: "Name",
      cell: (item) => item.name,
      sortable: true,
    },
    {
      id: "bio",
      header: "Bio",
      cell: (item) => <div className="max-w-xs truncate">{item.bio}</div>,
    },
    {
      id: "email",
      header: "Email",
      cell: (item) => item.email || "N/A",
    },
    {
      id: "phone",
      header: "Phone",
      cell: (item) => item.phone || "N/A",
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <span
          className={
            item.status === "active" ? "text-green-600" : "text-red-600"
          }
        >
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </span>
      ),
      sortable: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <Button
          variant="destructive"
          size="sm"
          onClick={() => handleDeleteArtist(item.id)}
        >
          Delete
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">All Artists</h1>
        <Button onClick={() => setDrawerOpen(true)}>Add Artist</Button>
      </div>

      <DataTable
        data={artists}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 5, pageSizeOptions: [5, 10, 20] }}
      />

      <ArtistModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onArtistAdded={handleArtistAdded}
      />
    </div>
  );
}
