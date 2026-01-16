export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 dark:bg-zinc-900 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              KLeague Manager
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Fantasy Football Keeper League
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
