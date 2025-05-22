
export interface Artwork {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  price?: number;
  availableForSale: boolean;
  featured: boolean;
  createdAt: Date;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  coverImageUrl: string;
  artworkIds: string[];
  featured: boolean;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startDate: Date;
  endDate?: Date;
  location: string;
  featured: boolean;
  createdAt: Date;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | "seller";
  lastLogin?: Date;
}

export interface DashboardStats {
  totalArtworks: number;
  totalCollections: number;
  totalEvents: number;
  unreadMessages: number;
}
