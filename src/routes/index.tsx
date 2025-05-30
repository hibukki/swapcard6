import { SignInButton } from "@clerk/clerk-react";
import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { api } from "../../convex/_generated/api";

const usersQueryOptions = convexQuery(api.users.listUsers, {});

export const Route = createFileRoute("/")({
  loader: async ({ context: { queryClient } }) =>
    await queryClient.ensureQueryData(usersQueryOptions),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col gap-8 w-full py-8">
      <h1 className="text-4xl font-bold text-center">Fullstack Vibe Coding</h1>

      <Unauthenticated>
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg text-center">Sign in to see the list of users.</p>
          <SignInButton mode="modal">
            <button className="btn btn-primary btn-lg">Get Started</button>
          </SignInButton>
        </div>
      </Unauthenticated>

      <Authenticated>
        <UsersList />
      </Authenticated>
    </div>
  );
}

function UsersList() {
  const { data: users } = useSuspenseQuery(usersQueryOptions);

  return (
    <div className="max-w-4xl mx-auto w-full">
      <h2 className="text-2xl font-bold mb-4">Users</h2>
      
      {users.length === 0 ? (
        <div className="text-center p-8 bg-base-200 rounded-lg">
          <p className="text-lg">No users yet. You're the first!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{new Date(user._creationTime).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}