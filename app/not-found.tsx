import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                KLeague Manager
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Fantasy Football Keeper League
              </p>
            </div>

            <div className="mt-8 text-center">
              <p className="text-5xl font-bold text-primary">404</p>
              <h2 className="mt-4 text-lg font-semibold text-foreground">
                Page not found
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                That link doesn&apos;t go anywhere. It may have moved, or the
                address may have a typo.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-2">
              <Button asChild>
                <Link href="/my-team">Go to My Team</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/draft-board">View Draft Board</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
