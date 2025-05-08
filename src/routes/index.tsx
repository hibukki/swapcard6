import { SignInButton } from "@clerk/clerk-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col gap-8 w-full py-8">
      <h1 className="text-4xl font-bold text-center">Fullstack Vibe Coding</h1>

      <div className="prose lg:prose-xl mx-auto max-w-full">
        <p className="lead">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam
          euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, quis
          aliquam nisl nunc eu nisl.
        </p>

        <p>
          Pellentesque habitant morbi tristique senectus et netus et malesuada
          fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae,
          ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam
          egestas semper. Aenean ultricies mi vitae est. Mauris placerat
          eleifend leo.
        </p>

        <p>
          Quisque sit amet est et sapien ullamcorper pharetra. Vestibulum erat
          wisi, condimentum sed, commodo vitae, ornare sit amet, wisi. Aenean
          fermentum, elit eget tincidunt condimentum, eros ipsum rutrum orci,
          sagittis tempus lacus enim ac dui.
        </p>

        <Unauthenticated>
          <div className="flex justify-center mt-8">
            <SignInButton mode="modal">
              <button className="btn btn-primary btn-lg">Get Started</button>
            </SignInButton>
          </div>
        </Unauthenticated>

        <Authenticated>
          <div className="flex justify-center mt-8">
            <Link to="/chat" className="btn btn-primary btn-lg">
              Go to Chat
            </Link>
          </div>
        </Authenticated>
      </div>
    </div>
  );
}
