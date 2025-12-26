import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Pencil, 
  Trash2, 
  Power, 
  PowerOff,
  GripVertical,
  Save,
  RotateCcw
} from "lucide-react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MenuItem {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  isActive: boolean;
  displayOrder: number;
  level: number;
}

interface TreeItem extends MenuItem {
  children: TreeItem[];
  isOpen?: boolean;
}

export default function MenuManager() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemSlug, setNewItemSlug] = useState("");
  const [newItemIsActive, setNewItemIsActive] = useState(true);
  const [newItemParentId, setNewItemParentId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchMenuItems = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "menus"), orderBy("displayOrder", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedItems = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MenuItem[];
      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      toast.error("Failed to fetch menu items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const buildTree = (data: MenuItem[], parentId: string | null = null, level = 0): TreeItem[] => {
    return data
      .filter((item) => item.parentId === parentId)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((item) => ({
        ...item,
        level,
        children: buildTree(data, item.id, level + 1),
      }));
  };

  const menuTree = buildTree(items);

  const handleSaveItem = async () => {
    if (!newItemName.trim()) {
      toast.error("Name is required");
      return;
    }

    const itemData = {
      name: newItemName,
      slug: newItemSlug || newItemName.toLowerCase().replace(/\s+/g, "-"),
      isActive: newItemIsActive,
      parentId: newItemParentId,
      updatedAt: new Date(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, "menus", editingItem.id), itemData);
        toast.success("Item updated successfully");
      } else {
        const displayOrder = items.filter(i => i.parentId === newItemParentId).length;
        await addDoc(collection(db, "menus"), {
          ...itemData,
          displayOrder,
          createdAt: new Date(),
        });
        toast.success("Item added successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchMenuItems();
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Failed to save item");
    }
  };

  const resetForm = () => {
    setNewItemName("");
    setNewItemSlug("");
    setNewItemIsActive(true);
    setNewItemParentId(null);
    setEditingItem(null);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemSlug(item.slug);
    setNewItemIsActive(item.isActive);
    setNewItemParentId(item.parentId);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item and its subcategories?")) return;

    try {
      // Find all children recursively to delete
      const getChildrenIds = (parentId: string): string[] => {
        const children = items.filter(i => i.parentId === parentId);
        return children.reduce((acc, child) => [...acc, child.id, ...getChildrenIds(child.id)], [] as string[]);
      };

      const idsToDelete = [id, ...getChildrenIds(id)];
      const batch = writeBatch(db);
      idsToDelete.forEach(itemId => {
        batch.delete(doc(db, "menus", itemId));
      });
      await batch.commit();
      toast.success("Items deleted successfully");
      fetchMenuItems();
    } catch (error) {
      console.error("Error deleting menu items:", error);
      toast.error("Failed to delete items");
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      await updateDoc(doc(db, "menus", item.id), {
        isActive: !item.isActive,
        updatedAt: new Date(),
      });
      fetchMenuItems();
    } catch (error) {
      console.error("Error toggling status:", error);
      toast.error("Failed to update status");
    }
  };

  const flattenTree = (tree: TreeItem[]): MenuItem[] => {
    let flat: MenuItem[] = [];
    tree.forEach((node) => {
      const { children, ...rest } = node;
      flat.push(rest);
      if (children.length > 0) {
        flat = [...flat, ...flattenTree(children)];
      }
    });
    return flat;
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = items.find(i => i.id === activeId);
    const overItem = items.find(i => i.id === overId);

    if (!activeItem || !overItem) return;

    // We only support reordering within the same parent for now to keep it simple
    // but a true visual tree builder would allow changing parents.
    // For now, let's implement reordering within the same parent level.
    if (activeItem.parentId !== overItem.parentId) {
      toast.info("Moving between levels is not supported via drag and drop yet. Please use the edit dialog.");
      return;
    }

    const sameLevelItems = items.filter(i => i.parentId === activeItem.parentId);
    const oldIndex = sameLevelItems.findIndex(i => i.id === activeId);
    const newIndex = sameLevelItems.findIndex(i => i.id === overId);

    const reorderedLevel = arrayMove(sameLevelItems, oldIndex, newIndex);
    
    // Update displayOrder for all items in this level
    const updatedItems = items.map(item => {
      const inReordered = reorderedLevel.findIndex(ri => ri.id === item.id);
      if (inReordered !== -1) {
        return { ...item, displayOrder: inReordered };
      }
      return item;
    });

    setItems(updatedItems);
    setHasChanges(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    try {
      const batch = writeBatch(db);
      items.forEach((item) => {
        batch.update(doc(db, "menus", item.id), {
          displayOrder: item.displayOrder,
          updatedAt: new Date(),
        });
      });
      await batch.commit();
      setHasChanges(false);
      toast.success("Menu order saved successfully");
    } catch (error) {
      console.error("Error saving order:", error);
      toast.error("Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menu Manager</h1>
          <p className="text-muted-foreground">Build and organize your navigation categories and subcategories.</p>
        </div>
        <div className="flex gap-3">
          {hasChanges && (
            <>
              <Button variant="outline" onClick={fetchMenuItems} disabled={saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={saveOrder} disabled={saving} className="bg-artist-purple hover:bg-artist-purple/90">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          )}
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-artist-purple hover:bg-artist-purple/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 bg-muted/30 border-b flex items-center justify-between font-medium text-sm">
          <div className="flex-1 px-4">Menu Structure</div>
          <div className="w-48 text-center">Status</div>
          <div className="w-48 text-right px-4">Actions</div>
        </div>

        <div className="p-4 min-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <span className="animate-spin h-8 w-8 border-4 border-artist-purple border-t-transparent rounded-full"></span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Plus className="h-12 w-12 mb-4 opacity-20" />
              <p>No menu items yet. Create your first category!</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <div className="space-y-2">
                {menuTree.map((item) => (
                  <TreeItemRow 
                    key={item.id} 
                    item={item} 
                    onEdit={handleEdit} 
                    onDelete={handleDelete} 
                    onToggle={handleToggleActive}
                    onAddSub={() => {
                      resetForm();
                      setNewItemParentId(item.id);
                      setDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            </DndContext>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Category" : "Add New Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={newItemName} 
                onChange={(e) => setNewItemName(e.target.value)} 
                placeholder="Category Name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <Input 
                id="slug" 
                value={newItemSlug} 
                onChange={(e) => setNewItemSlug(e.target.value)} 
                placeholder="category-slug"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="parent">Parent Category</Label>
              <select 
                id="parent"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newItemParentId || ""}
                onChange={(e) => setNewItemParentId(e.target.value || null)}
              >
                <option value="">None (Top Level)</option>
                {items
                  .filter(i => i.id !== editingItem?.id) // Don't allow self as parent
                  .map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="active" 
                checked={newItemIsActive} 
                onCheckedChange={setNewItemIsActive}
              />
              <Label htmlFor="active">Active State</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-artist-purple hover:bg-artist-purple/90" onClick={handleSaveItem}>
              {editingItem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TreeItemRow({ 
  item, 
  onEdit, 
  onDelete, 
  onToggle,
  onAddSub
}: { 
  item: TreeItem; 
  onEdit: (item: MenuItem) => void;
  onDelete: (id: string) => void;
  onToggle: (item: MenuItem) => void;
  onAddSub: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className={`
        flex items-center p-3 rounded-lg border bg-card transition-all group
        ${item.isActive ? "border-border shadow-sm hover:border-artist-purple/30" : "border-dashed opacity-70 bg-muted/10"}
        ${isDragging ? "ring-2 ring-artist-purple border-artist-purple shadow-xl" : ""}
      `}>
        {/* Visual Connector Line for Sub-items */}
        {item.level > 0 && (
          <div className="absolute left-[-16px] top-[24px] w-4 h-[2px] bg-border" />
        )}

        <div className="flex items-center flex-1 gap-2">
          {/* Drag Handle */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing hover:text-artist-purple p-1.5 rounded-md hover:bg-muted transition-colors">
            <GripVertical className="h-4 w-4 text-muted-foreground/60" />
          </div>

          {/* Icon based on level */}
          <div className={`
            flex items-center justify-center p-2 rounded-lg
            ${item.level === 0 ? "bg-artist-purple/10 text-artist-purple" : "bg-blue-50 text-blue-600"}
          `}>
            {item.children.length > 0 ? (
              <button 
                onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                className="hover:scale-110 transition-transform"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <Plus className="h-3 w-3 opacity-40" />
            )}
          </div>

          <div className="flex flex-col ml-1">
            <div className="items-center flex gap-2">
              <span className={`font-semibold text-sm ${!item.isActive && "text-muted-foreground line-through"}`}>
                {item.name}
              </span>
              {item.children.length > 0 && (
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                  {item.children.length}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              /{item.slug}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="w-32 flex justify-center">
          <div 
            onClick={() => onToggle(item)}
            className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all
              ${item.isActive 
                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                : "bg-red-50 text-red-600 hover:bg-red-100"}
            `}
          >
            <div className={`h-1.5 w-1.5 rounded-full ${item.isActive ? "bg-green-500 animate-pulse" : "bg-red-400"}`} />
            {item.isActive ? "Active" : "Disabled"}
          </div>
        </div>

        <div className="w-48 flex justify-end gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={onAddSub} title="Add Subcategory">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-600 hover:bg-slate-50" onClick={() => onEdit(item)} title="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50" onClick={handleDelete} disabled={isDeleting} title="Delete">
            {isDeleting ? <span className="animate-spin h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && item.children.length > 0 && (
        <div className="ml-10 mt-2 border-l-2 border-slate-100 pl-4 space-y-2 relative">
          <SortableContext items={item.children.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {item.children.map((child) => (
              <TreeItemRow 
                key={child.id} 
                item={child} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onToggle={onToggle}
                onAddSub={onAddSub}
              />
            ))}
          </SortableContext>
        </div>
      )}
    </div>
  );
}
