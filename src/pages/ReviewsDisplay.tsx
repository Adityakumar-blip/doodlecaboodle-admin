import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Eye, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReviewModal from "@/views/ReviewModal";

interface Review {
  id: string;
  createdAt: Date | string;
  email: string;
  mediaUrl: string;
  isActive: boolean;
  isPublished: boolean;
  name: string;
  rating: number;
  reviewText: string;
}

const ReviewsDisplay: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "reviews"));
      const fetchedReviews = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || doc.data().createdAt,
      })) as Review[];
      setReviews(fetchedReviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to fetch reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleView = (review: Review) => {
    setSelectedReview(review);
    setDrawerOpen(true);
  };

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setDrawerOpen(true);
  };

  const handleDelete = async (review: Review) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        const reviewRef = doc(db, "reviews", review.id);
        await deleteDoc(reviewRef);
        setReviews(reviews.filter((r) => r.id !== review.id));
        toast.success("Review deleted successfully");
      } catch (error) {
        console.error("Error deleting review:", error);
        toast.error("Failed to delete review");
      }
    }
  };

  const handleToggle = async (
    review: Review,
    field: "isActive" | "isPublished"
  ) => {
    try {
      const reviewRef = doc(db, "reviews", review.id);
      await updateDoc(reviewRef, { [field]: !review[field] });
      setReviews(
        reviews.map((r) =>
          r.id === review.id ? { ...r, [field]: !r[field] } : r
        )
      );
      toast.success(`Review ${field} updated successfully`);
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      toast.error(`Failed to update ${field}`);
    }
  };

  const handleReviewAdded = (newReview: Review) => {
    if (newReview.id) {
      setReviews((prev) =>
        prev.some((r) => r.id === newReview.id)
          ? prev.map((r) => (r.id === newReview.id ? newReview : r))
          : [...prev, newReview]
      );
    }
    setEditingReview(null);
  };

  const columns: DataTableColumn<Review>[] = [
    {
      id: "name",
      header: "Name",
      cell: (item) => <div>{item.name}</div>,
      sortable: true,
    },
    {
      id: "email",
      header: "Email",
      cell: (item) => <div>{item.email}</div>,
    },
    {
      id: "rating",
      header: "Rating",
      cell: (item) => <div>{item.rating}/5</div>,
      sortable: true,
    },
    {
      id: "createdAt",
      header: "Date",
      cell: (item) => <div>{new Date(item.createdAt).toLocaleString()}</div>,
      sortable: true,
    },
    {
      id: "isActive",
      header: "Active",
      cell: (item) => (
        <Switch
          checked={item.isActive}
          onCheckedChange={() => handleToggle(item, "isActive")}
        />
      ),
    },
    {
      id: "isPublished",
      header: "Published",
      cell: (item) => (
        <Switch
          checked={item.isPublished}
          onCheckedChange={() => handleToggle(item, "isPublished")}
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(item)}
            className="h-8 px-2"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(item)}
            className="h-8 px-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading reviews...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Review Management</h1>
          <div className="mt-2">
            <Badge variant="default">Total: {reviews.length}</Badge>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingReview(null);
            setDrawerOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Add Review
        </Button>
      </div>

      <DataTable
        data={reviews}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
        searchPlaceholder="Search reviews by name or email..."
      />

      <ReviewModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onReviewAdded={handleReviewAdded}
        editingReview={editingReview}
      />

      {selectedReview && (
        <Dialog
          open={drawerOpen && !editingReview}
          onOpenChange={setDrawerOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="font-semibold">Name</label>
                <p>{selectedReview.name}</p>
              </div>
              <div>
                <label className="font-semibold">Email</label>
                <p>{selectedReview.email}</p>
              </div>
              <div>
                <label className="font-semibold">Rating</label>
                <p>{selectedReview.rating}/5</p>
              </div>
              <div>
                <label className="font-semibold">Review Text</label>
                <p>{selectedReview.reviewText}</p>
              </div>
              {selectedReview.mediaUrl && (
                <div>
                  <label className="font-semibold">Media</label>
                  {selectedReview.mediaUrl.match(/\.(mp4|webm)$/i) ? (
                    <video
                      src={selectedReview.mediaUrl}
                      className="h-32 w-32 object-cover"
                      controls
                    />
                  ) : (
                    <img
                      src={selectedReview.mediaUrl}
                      alt="Review media"
                      className="h-32 w-32 object-cover"
                    />
                  )}
                </div>
              )}
              <div>
                <label className="font-semibold">Date</label>
                <p>{new Date(selectedReview.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="font-semibold">Status</label>
                <p>
                  Active: {selectedReview.isActive ? "Yes" : "No"} | Published:{" "}
                  {selectedReview.isPublished ? "Yes" : "No"}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReviewsDisplay;
