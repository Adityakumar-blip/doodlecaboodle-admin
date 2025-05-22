import React from "react";
import { cn } from "@/lib/utils";
import { DataTable, DataTableColumn } from "@/components/DataTable";

// Define User type
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
}

// Mock user data
const users: User[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    status: "Active",
    createdAt: "2023-01-15",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    role: "User",
    status: "Active",
    createdAt: "2023-02-20",
  },
  {
    id: "3",
    name: "Bob Johnson",
    email: "bob@example.com",
    role: "Editor",
    status: "Inactive",
    createdAt: "2023-03-10",
  },
  {
    id: "4",
    name: "Alice Brown",
    email: "alice@example.com",
    role: "User",
    status: "Active",
    createdAt: "2023-04-05",
  },
  {
    id: "5",
    name: "Charlie Wilson",
    email: "charlie@example.com",
    role: "Admin",
    status: "Active",
    createdAt: "2023-05-12",
  },
];

// Define table columns
const columns: DataTableColumn<User>[] = [
  {
    id: "name",
    header: "Name",
    cell: (item) => item.name,
    sortable: true,
  },
  {
    id: "email",
    header: "Email",
    cell: (item) => item.email,
    sortable: true,
  },
  {
    id: "role",
    header: "Role",
    cell: (item) => item.role,
    sortable: true,
  },
  {
    id: "status",
    header: "Status",
    cell: (item) => (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          item.status === "Active"
            ? "bg-green-100 text-green-800"
            : "bg-red-100 text-red-800"
        )}
      >
        {item.status}
      </span>
    ),
    sortable: true,
  },
  {
    id: "createdAt",
    header: "Joined",
    cell: (item) => new Date(item.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

const UserPage: React.FC = () => {
  const handleRowClick = (user: User) => {
    console.log("Clicked user:", user);
    // Add your row click handling logic here (e.g., navigate to user details)
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <DataTable
        data={users}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchable
        searchPlaceholder="Search users..."
        searchFunction={(item, term) =>
          item.name.toLowerCase().includes(term.toLowerCase()) ||
          item.email.toLowerCase().includes(term.toLowerCase()) ||
          item.role.toLowerCase().includes(term.toLowerCase())
        }
        onRowClick={handleRowClick}
        pagination={{
          pageSize: 5,
          pageSizeOptions: [5, 10, 20],
        }}
        className="w-full"
      />
    </div>
  );
};

export default UserPage;
