
import { useRouteError } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError() as Error;
  console.error(error);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-artist-purple mb-4">Oops!</h1>
        <p className="text-2xl mb-6">Something went wrong</p>
        <p className="text-muted-foreground mb-8">
          {error?.message || "An unexpected error occurred"}
        </p>
        <Button className="bg-artist-purple hover:bg-artist-purple/90">
          <Link to="/">Return to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
