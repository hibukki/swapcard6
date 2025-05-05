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
            <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-bold">Arbiter Convex</h1>
                <nav className="flex space-x-4">
                  <Link
                    to="/"
                    className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    activeProps={{
                      className: "font-bold bg-gray-200 dark:bg-gray-700",
                    }}
                  >
                    Home
                  </Link>
                  <Link
                    to="/send"
                    className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    activeProps={{
                      className: "font-bold bg-gray-200 dark:bg-gray-700",
                    }}
                  >
                    Send Clips
                  </Link>
                  <Link
                    to="/transactions"
                    className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    activeProps={{
                      className: "font-bold bg-gray-200 dark:bg-gray-700",
                    }}
                  >
                    Transactions
                  </Link>
                </nav>
              </div>
              <UserButton />
            </header>
            <main className="flex-1 p-4">
              <Outlet />
            </main>
            <footer className="p-4 text-center text-sm text-gray-500">
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
    <div className="flex flex-col gap-8 min-h-screen justify-center items-center">
      <h1 className="text-4xl font-bold text-center">Arbiter Convex</h1>
      <div className="flex flex-col gap-8 w-96 mx-auto">
        <p>Sign in to access the exchange</p>
        <SignInButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2">
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="bg-dark dark:bg-light text-light dark:text-dark text-sm px-4 py-2 rounded-md border-2">
            Sign up
          </button>
        </SignUpButton>
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
