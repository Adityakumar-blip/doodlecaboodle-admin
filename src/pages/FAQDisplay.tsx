import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Trash2, Edit } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import FAQModal from "@/views/FAQModal";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  status: "active" | "inactive";
  createdAt?: Date;
  updatedAt?: Date;
}

const FAQDisplay: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFAQs = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "faqs"));
      const fetchedFAQs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as FAQ[];
      setFaqs(fetchedFAQs);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast.error("Failed to fetch FAQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFAQs();
  }, []);

  const handleEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setDrawerOpen(true);
  };

  const handleDelete = async (faqId: string) => {
    try {
      await deleteDoc(doc(db, "faqs", faqId));
      setFaqs((prev) => prev.filter((faq) => faq.id !== faqId));
      toast.success("FAQ deleted successfully");
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error("Failed to delete FAQ");
    }
  };

  const handleToggleStatus = async (faq: FAQ) => {
    try {
      const newStatus = faq.status === "active" ? "inactive" : "active";
      const docRef = doc(db, "faqs", faq.id);
      await updateDoc(docRef, { status: newStatus, updatedAt: new Date() });
      setFaqs((prev) =>
        prev.map((item) =>
          item.id === faq.id
            ? { ...item, status: newStatus, updatedAt: new Date() }
            : item
        )
      );
      toast.success(
        `FAQ ${
          newStatus === "active" ? "activated" : "deactivated"
        } successfully`
      );
    } catch (error) {
      console.error("Error updating FAQ status:", error);
      toast.error("Failed to update FAQ status");
    }
  };

  const handleFAQAdded = (newFAQ: FAQ) => {
    if (editingFAQ) {
      setFaqs((prev) =>
        prev.map((faq) =>
          faq.id === editingFAQ.id ? { ...newFAQ, id: editingFAQ.id } : faq
        )
      );
      toast.success("FAQ updated successfully");
    } else {
      setFaqs((prev) => [...prev, newFAQ]);
      toast.success("FAQ added successfully");
    }
    setEditingFAQ(null);
    setDrawerOpen(false);
  };

  const columns: DataTableColumn<FAQ>[] = [
    {
      id: "question",
      header: "Question",
      cell: (item) => <div className="font-medium">{item.question}</div>,
      sortable: true,
    },
    {
      id: "answer",
      header: "Answer",
      cell: (item) => (
        <div className="max-w-xs truncate" title={item.answer}>
          {item.answer}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Switch
            checked={item.status === "active"}
            onCheckedChange={() => handleToggleStatus(item)}
          />
          <Badge variant={item.status === "active" ? "success" : "secondary"}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Badge>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(item)}
            className="h-8 w-8 p-0"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  FAQ "{item.question}" and remove it from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading FAQs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">FAQ Management</h1>
          <div className="mt-2">
            <Badge variant="default">Total: {faqs.length}</Badge>
          </div>
        </div>
        <Button onClick={() => setDrawerOpen(true)}>Add FAQ</Button>
      </div>

      <DataTable
        data={faqs}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
        searchPlaceholder="Search FAQs by question or answer..."
      />

      <FAQModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onFAQAdded={handleFAQAdded}
        editingFAQ={editingFAQ}
      />
    </div>
  );
};

export default FAQDisplay;
