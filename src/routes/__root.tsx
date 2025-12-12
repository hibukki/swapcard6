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
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/NotificationsBell";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  convexClient: ConvexReactClient;
}>()({
  component: RootComponent,
});

const navLinks = [
  { to: "/attendees", label: "Attendees" },
  { to: "/public-meetings", label: "Public Meetings" },
  { to: "/calendar", label: "Calendar" },
  { to: "/agenda", label: "Agenda" },
  { to: "/chats", label: "Chat" },
  { to: "/profile", label: "Profile" },
  { to: "/config", label: "Config" },
] as const;

function RootComponent() {
  const { queryClient, convexClient: convex } = Route.useRouteContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                      <Link key={link.to} to={link.to}>
                        {({ isActive }) => (
                          <Button variant="ghost" active={isActive}>
                            {link.label}
                          </Button>
                        )}
                      </Link>
                    ))}
                  </nav>

                  <div className="flex items-center gap-2">
                    <NotificationsBell />
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
