import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
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
import ConfigurationModal from "@/views/ConfigurationModal";

interface Config {
  id: string;
  quote: string;
  heroBanner: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ConfigurationDisplay: React.FC = () => {
  const [configs, setConfigs] = useState<Config[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "configuration"));
      const fetchedConfigs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
      })) as Config[];

      setConfigs(fetchedConfigs);
    } catch (error) {
      console.error("Error fetching configuration:", error);
      toast.error("Failed to fetch configuration");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleEdit = (config: Config) => {
    setEditingConfig(config);
    setDrawerOpen(true);
  };

  const handleDelete = async (configId: string) => {
    try {
      await deleteDoc(doc(db, "configuration", configId));
      setConfigs((prev) => prev.filter((config) => config.id !== configId));
      toast.success("Configuration deleted successfully");
    } catch (error) {
      console.error("Error deleting configuration:", error);
      toast.error("Failed to delete configuration");
    }
  };

  const handleConfigSaved = (newConfig: Config) => {
    if (editingConfig) {
      setConfigs((prev) =>
        prev.map((config) =>
          config.id === editingConfig.id
            ? { ...newConfig, id: editingConfig.id }
            : config
        )
      );
      toast.success("Configuration updated successfully");
    } else {
      setConfigs((prev) => [...prev, newConfig]);
      toast.success("Configuration added successfully");
    }

    setEditingConfig(null);
    setDrawerOpen(false);
  };

  const columns: DataTableColumn<Config>[] = [
    {
      id: "quote",
      header: "Quote",
      cell: (item) => (
        <div className="max-w-xs truncate" title={item.quote}>
          {item.quote}
        </div>
      ),
      sortable: true,
    },
    {
      id: "heroBanner",
      header: "Hero Banner",
      cell: (item) => (
        <div className="font-medium max-w-xs truncate" title={item.heroBanner}>
          {item.heroBanner}
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

          {/* Delete Dialog */}
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
                <AlertDialogTitle>Delete Configuration?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  this configuration entry.
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
      <div className="p-4 flex justify-center items-center h-64">
        <div className="text-lg">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold">Configuration</h1>
          <Badge variant="default" className="mt-2">
            Total: {configs.length}
          </Badge>
        </div>

        <Button onClick={() => setDrawerOpen(true)}>Add Configuration</Button>
      </div>

      {/* Table */}
      <DataTable
        data={configs}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 10, pageSizeOptions: [5, 10, 20] }}
        searchPlaceholder="Search configuration..."
      />

      {/* Drawer Modal */}
      <ConfigurationModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        editingConfig={editingConfig}
        onConfigSaved={handleConfigSaved}
      />
    </div>
  );
};

export default ConfigurationDisplay;
