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
} from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useState } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      afterSignOutUrl="/"
    >
      <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
        <div className="min-h-screen flex flex-col">
          <Authenticated>
            {/* Mobile sidebar drawer */}
            <div className="drawer min-h-screen">
              <input
                id="drawer-toggle"
                type="checkbox"
                className="drawer-toggle"
                checked={isSidebarOpen}
                onChange={toggleSidebar}
              />
              <div className="drawer-content container mx-auto flex flex-col h-full">
                {/* Navbar */}
                <header className="navbar bg-base-100 shadow-sm border-b border-base-300">
                  <div className="navbar-start">
                    <label
                      htmlFor="drawer-toggle"
                      className="btn btn-square btn-ghost drawer-button lg:hidden mr-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        className="inline-block w-5 h-5 stroke-current"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M4 6h16M4 12h16M4 18h16"
                        ></path>
                      </svg>
                    </label>
                    <Link to="/" className="btn btn-ghost text-xl">
                      Fullstack Vibe Coding
                    </Link>
                  </div>
                  <div className="navbar-center hidden lg:flex">
                    <nav className="flex">
                      <Link
                        to="/"
                        className="btn btn-ghost"
                        activeProps={{
                          className: "btn btn-ghost btn-active",
                        }}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        Home
                      </Link>
                      <Link
                        to="/chat"
                        className="btn btn-ghost"
                        activeProps={{
                          className: "btn btn-ghost btn-active",
                        }}
                        onClick={() => setIsSidebarOpen(false)}
                      >
                        Chat
                      </Link>
                    </nav>
                  </div>
                  <div className="navbar-end">
                    <UserButton />
                  </div>
                </header>
                {/* Main content */}
                <main className="flex-1 p-4">
                  <div className="mx-auto">
                    <Outlet />
                  </div>
                </main>
                <footer className="footer footer-center p-4 text-base-content">
                  <div className="mx-auto">
                    © {new Date().getFullYear()} Fullstack Vibe Coding
                  </div>
                </footer>
              </div>
              {/* Sidebar content for mobile */}
              <div className="drawer-side z-10">
                <label
                  htmlFor="drawer-toggle"
                  aria-label="close sidebar"
                  className="drawer-overlay"
                ></label>
                <div className="menu p-4 w-64 min-h-full bg-base-200 text-base-content flex flex-col">
                  <div className="flex-1">
                    <div className="menu-title mb-4">Menu</div>
                    <ul className="space-y-2">
                      <li>
                        <Link
                          to="/"
                          onClick={() => setIsSidebarOpen(false)}
                          activeProps={{
                            className: "active",
                          }}
                          className="flex items-center p-2"
                        >
                          Home
                        </Link>
                      </li>
                      <li>
                        <Link
                          to="/chat"
                          onClick={() => setIsSidebarOpen(false)}
                          activeProps={{
                            className: "active",
                          }}
                          className="flex items-center p-2"
                        >
                          Chat
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="mt-auto py-4 border-t border-base-300 flex justify-center items-center">
                    <UserButton />
                  </div>
                </div>
              </div>
            </div>
          </Authenticated>
          <Unauthenticated>
            <div className="min-h-screen flex flex-col">
              <header className="navbar bg-base-100 shadow-sm border-b border-base-300">
                <div className="container mx-auto flex justify-between w-full">
                  <div className="navbar-start">
                    <h1 className="text-xl font-bold">Fullstack Vibe Coding</h1>
                  </div>
                  <div className="navbar-end">
                    <SignInButton mode="modal">
                      <button className="btn btn-primary btn-sm">
                        Sign in
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="btn btn-ghost btn-sm ml-2">
                        Sign up
                      </button>
                    </SignUpButton>
                  </div>
                </div>
              </header>
              <main className="flex-1">
                <div className="container mx-auto p-4">
                  <Outlet />
                </div>
              </main>
              <footer className="footer footer-center p-4 text-base-content">
                <div className="mx-auto">
                  © {new Date().getFullYear()} Fullstack Vibe Coding
                </div>
              </footer>
            </div>
          </Unauthenticated>
        </div>
        {import.meta.env.DEV && <TanStackRouterDevtools />}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
