import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth as useClerkAuth,
} from "@clerk/clerk-react";
import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import {
  Authenticated,
  ConvexReactClient,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <InitializeUser />
        <div className="min-h-screen flex flex-col">
          <Authenticated>
            <header className="navbar bg-base-100 shadow-sm border-b border-base-300">
              <div className="navbar-start">
                <h1 className="text-xl font-bold">Arbiter Convex</h1>
              </div>
              <div className="navbar-center">
                <nav className="flex">
                  <Link
                    to="/"
                    className="btn btn-ghost"
                    activeProps={{
                      className: "btn btn-ghost btn-active",
                    }}
                  >
                    Home
                  </Link>
                  <Link
                    to="/send"
                    className="btn btn-ghost"
                    activeProps={{
                      className: "btn btn-ghost btn-active",
                    }}
                  >
                    Send Clips
                  </Link>
                  <Link
                    to="/transactions"
                    className="btn btn-ghost"
                    activeProps={{
                      className: "btn btn-ghost btn-active",
                    }}
                  >
                    Transactions
                  </Link>
                </nav>
              </div>
              <div className="navbar-end">
                <UserButton />
              </div>
            </header>
            <main className="flex-1 p-4">
              <Outlet />
            </main>
            <footer className="footer footer-center p-4 text-base-content">
              © {new Date().getFullYear()} Arbiter Convex
            </footer>
          </Authenticated>
          <Unauthenticated>
            <SignInForm />
          </Unauthenticated>
        </div>
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

function SignInForm() {
  return (
    <div className="hero min-h-screen">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-4xl font-bold">Arbiter Convex</h1>
          <p className="py-6">Sign in to access the exchange</p>
          <div className="flex flex-col gap-4">
            <SignInButton mode="modal">
              <button className="btn btn-primary">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn btn-outline">Sign up</button>
            </SignUpButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function InitializeUser() {
  const { isSignedIn } = useClerkAuth();
  const initUser = useMutation(api.exchange.getOrCreateUser);

  useEffect(() => {
    if (isSignedIn) {
      void initUser({});
    }
  }, [isSignedIn, initUser]);

  return null;
}
