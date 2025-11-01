import FilterModal from "@/views/FilterModal";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/DataTable";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import React, { useEffect, useState } from "react";

type Filter = {
  id: string;
  categoryId: string;
  title: string;
  type: string;
  options?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

type Category = {
  id: string;
  name: string;
};

const FilterDisplay = () => {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<Filter | null>(null);

  // Fetch Categories for name resolution
  const fetchCategories = async () => {
    try {
      const q = await getDocs(collection(db, "productCategories"));
      const cats = q.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Category[];
      setCategories(cats);
    } catch (err) {
      toast.error("Failed to load categories");
    }
  };

  // Fetch Filters
  const fetchFilters = async () => {
    try {
      const qs = await getDocs(collection(db, "filters"));
      const data = qs.docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          ...raw,
          createdAt: raw.createdAt?.toDate?.() || null,
          updatedAt: raw.updatedAt?.toDate?.() || null,
        };
      }) as Filter[];

      setFilters(data);
    } catch (err) {
      toast.error("Failed to fetch filters");
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchFilters();
  }, []);

  // Add
  const handleFilterAdded = (newFilter: Filter) => {
    setFilters((prev) => [...prev, newFilter]);
    setDrawerOpen(false);
  };

  // Update
  const handleFilterUpdated = (updatedFilter: Filter) => {
    setFilters((prev) =>
      prev.map((f) => (f.id === updatedFilter.id ? updatedFilter : f))
    );
    setDrawerOpen(false);
    setSelectedFilter(null);
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "filters", id));
      setFilters((prev) => prev.filter((f) => f.id !== id));
      toast.success("Filter deleted");
    } catch (err) {
      toast.error("Failed to delete filter");
    }
  };

  // Edit
  const handleEdit = (filter: Filter) => {
    setSelectedFilter(filter);
    setDrawerOpen(true);
  };

  // Resolve Category Name
  const getCategoryName = (id: string) => {
    return categories.find((c) => c.id === id)?.name || "Unknown";
  };

  const columns: DataTableColumn<Filter>[] = [
    {
      id: "title",
      header: "Title",
      cell: (item) => item.title,
      sortable: true,
    },
    {
      id: "category",
      header: "Category",
      cell: (item) => getCategoryName(item.categoryId),
      sortable: true,
    },
    {
      id: "type",
      header: "Type",
      cell: (item) => item.type,
      sortable: true,
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(item.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Filters</h1>
        <Button
          onClick={() => {
            setSelectedFilter(null);
            setDrawerOpen(true);
          }}
        >
          Add Filter
        </Button>
      </div>

      {/* Table */}
      <DataTable
        data={filters}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        pagination={{ pageSize: 10, pageSizeOptions: [10, 20, 50] }}
      />

      {/* Modal */}
      <FilterModal
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
        onFilterAdded={handleFilterAdded}
        onFilterUpdated={handleFilterUpdated}
        selectedFilter={selectedFilter}
      />
    </div>
  );
};

export default FilterDisplay;
