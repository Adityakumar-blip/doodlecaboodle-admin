
import { useState, useEffect } from "react";
import { getDashboardStats } from "@/lib/firebaseService";
import { DashboardStats } from "@/types";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Image, FolderOpen, Calendar, MessageSquare, Loader } from "lucide-react";
import { Link } from "react-router-dom";

const CHART_COLORS = ["#9747FF", "#FF7EDB", "#52E3E1", "#FFF07C"];

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Sample data for charts
  const contentData = [
    { name: "Artworks", value: stats?.totalArtworks || 0 },
    { name: "Collections", value: stats?.totalCollections || 0 },
    { name: "Events", value: stats?.totalEvents || 0 },
    { name: "Messages", value: stats?.unreadMessages || 0 },
  ];

  const visitorData = [
    { name: "Jan", visitors: 400 },
    { name: "Feb", visitors: 600 },
    { name: "Mar", visitors: 800 },
    { name: "Apr", visitors: 1000 },
    { name: "May", visitors: 1200 },
    { name: "Jun", visitors: 1400 },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your admin panel</p>
        </div>
        <Button className="bg-artist-purple hover:bg-artist-purple/90">
          <span className="hidden sm:inline-block">View Website</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader className="h-8 w-8 text-artist-purple animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="admin-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Artworks</CardTitle>
                <Image className="h-4 w-4 text-artist-purple" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalArtworks || 0}</div>
                <Link to="/artworks">
                  <p className="text-xs text-artist-purple mt-1 hover:underline">
                    View all artworks
                  </p>
                </Link>
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Collections</CardTitle>
                <FolderOpen className="h-4 w-4 text-artist-pink" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalCollections || 0}</div>
                <Link to="/collections">
                  <p className="text-xs text-artist-pink mt-1 hover:underline">
                    View all collections
                  </p>
                </Link>
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Calendar className="h-4 w-4 text-artist-teal" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
                <Link to="/events">
                  <p className="text-xs text-artist-teal mt-1 hover:underline">
                    View all events
                  </p>
                </Link>
              </CardContent>
            </Card>
            <Card className="admin-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
                <MessageSquare className="h-4 w-4 text-artist-yellow" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
                <Link to="/messages">
                  <p className="text-xs text-artist-yellow mt-1 hover:underline">
                    View all messages
                  </p>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Content Overview</CardTitle>
                <CardDescription>
                  Distribution of your website content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={contentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => 
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {contentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Website Visitors</CardTitle>
                <CardDescription>
                  Monthly visitor statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={visitorData}
                      margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="visitors" 
                        stroke="#9747FF" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="admin-card lg:col-span-2">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks you might want to perform</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link to="/artworks/new">
                  <Button className="w-full bg-artist-purple hover:bg-artist-purple/90">
                    <Image className="mr-2 h-4 w-4" />
                    Add New Artwork
                  </Button>
                </Link>
                <Link to="/collections/new">
                  <Button className="w-full bg-artist-pink hover:bg-artist-pink/90">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Add New Collection
                  </Button>
                </Link>
                <Link to="/events/new">
                  <Button className="w-full bg-artist-teal hover:bg-artist-teal/90">
                    <Calendar className="mr-2 h-4 w-4" />
                    Add New Event
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="admin-card">
              <CardHeader>
                <CardTitle>Recent Updates</CardTitle>
                <CardDescription>Last actions performed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-artist-purple mr-2"></div>
                    <div className="text-sm">
                      <p className="font-medium">New artwork added</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-artist-pink mr-2"></div>
                    <div className="text-sm">
                      <p className="font-medium">Collection updated</p>
                      <p className="text-xs text-muted-foreground">Yesterday</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-artist-teal mr-2"></div>
                    <div className="text-sm">
                      <p className="font-medium">New event created</p>
                      <p className="text-xs text-muted-foreground">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
