import { Card, CardContent } from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                KLeague Manager
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Fantasy Football Keeper League
              </p>
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
