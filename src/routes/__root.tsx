import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth as useClerkAuth,
  useUser,
} from "@clerk/clerk-react";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useMatchRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  Authenticated,
  ConvexReactClient,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Menu } from "lucide-react";
import { NotificationBadge } from "@/components/NotificationBadge";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
}>()({
  component: RootComponent,
});

function useNavLinks() {
  const matchRoute = useMatchRoute();

  // Check if we're in any conference route
  const conferenceMatch = matchRoute({
    to: "/conference/$conferenceId",
    fuzzy: true,
  }) as { conferenceId?: string } | false;

  if (conferenceMatch && conferenceMatch.conferenceId) {
    const conferenceId = conferenceMatch.conferenceId;
    return [
      { to: "/conference/$conferenceId/attendees" as const, params: { conferenceId }, label: "Attendees" },
      { to: "/conference/$conferenceId/public-meetings" as const, params: { conferenceId }, label: "Public Meetings" },
      { to: "/conference/$conferenceId/rooms" as const, params: { conferenceId }, label: "Rooms" },
      { to: "/conference/$conferenceId/calendar" as const, params: { conferenceId }, label: "Calendar" },
      { to: "/conference/$conferenceId/chats" as const, params: { conferenceId }, label: "Chat" },
      { to: "/conference/$conferenceId/profile" as const, params: { conferenceId }, label: "Profile" },
    ];
  }

  // Outside conference context - no nav links (will show conference picker)
  return [];
}

function RootComponent() {
  const { queryClient, convexClient: convex } = Route.useRouteContext();

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen flex flex-col">
            <Authenticated>
              <EnsureUser />
              <AuthenticatedLayout />
            </Authenticated>
            <Unauthenticated>
              <UnauthenticatedView />
            </Unauthenticated>
          </div>
          {import.meta.env.DEV && <TanStackRouterDevtools />}
        </QueryClientProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function AuthenticatedLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navLinks = useNavLinks();

  return (
    <div className="container mx-auto flex flex-col min-h-screen">
      {/* Navbar */}
      <header className="flex items-center justify-between py-4 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          {/* Mobile menu */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {navLinks.map((link) => (
                <DropdownMenuItem key={link.to} asChild>
                  <Link
                    to={link.to}
                    params={link.params}
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full"
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link to="/">
            <Button variant="ghost" className="text-xl font-semibold">
              OpenCon
            </Button>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} params={link.params}>
              {({ isActive }) => (
                <Button variant="ghost" active={isActive}>
                  {link.label}
                </Button>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBadge />
          <UserButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 prose dark:prose-invert max-w-none">
        <Outlet />
      </main>

      <footer className="text-center p-4 text-muted-foreground">
        <p>© {new Date().getFullYear()} OpenCon</p>
      </footer>
    </div>
  );
}

function UnauthenticatedView() {
  const healthCheck = useQuery(api.health.check);
  const isConnected = healthCheck?.status === "ok";

  return (
    <>
      <header className="flex items-center justify-between py-4 px-4 border-b border-border">
        <div className="container mx-auto flex justify-between w-full">
          <div>
            <h1 className="font-semibold">OpenCon</h1>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">
              Debug: Backend connected? {isConnected ? "true" : "false"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <Button size="sm">Sign in</Button>
            </SignInButton>
            <SignUpButton mode="modal">
              <Button variant="ghost" size="sm">
                Sign up
              </Button>
            </SignUpButton>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 prose dark:prose-invert max-w-none">
        <Outlet />
      </main>
      <footer className="text-center p-4 text-muted-foreground">
        <p>© {new Date().getFullYear()} OpenCon</p>
      </footer>
    </>
  );
}

function EnsureUser() {
  const { isLoaded, isSignedIn, user } = useUser();
  const ensureUser = useMutation(api.users.ensureUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      void ensureUser();
    }
  }, [isLoaded, isSignedIn, user, ensureUser]);

  return null;
}
